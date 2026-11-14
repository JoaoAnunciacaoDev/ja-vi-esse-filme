import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { watchlistApi } from '@/api/watchlist'
import { MediaDetailsModal } from '@/features/media/MediaDetailsModal'
import { SeriesEvaluationModal } from '@/features/series/SeriesEvaluationModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { WatchStatus, MediaItem, UserMedia, MediaType } from '@/types/media'
import {
  Bookmark,
  Tv,
  Film,
  Check,
  Trash2,
  Heart,
  Plus,
  Loader2,
  Play,
  Pause,
  XCircle,
  Sparkles,
  Search,
  X,
  LayoutGrid,
} from 'lucide-react'

interface WatchlistPageProps {
  onOpenLogModal: (media?: MediaItem) => void
  onNavigateToCatalog: () => void
}

type TabType = WatchStatus | 'favorites' | 'all'

export function WatchlistPage({ onOpenLogModal, onNavigateToCatalog }: WatchlistPageProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [selectedUserMedia, setSelectedUserMedia] = useState<UserMedia | null>(null)
  const [itemToDelete, setItemToDelete] = useState<UserMedia | null>(null)
  const [seriesToEvaluate, setSeriesToEvaluate] = useState<MediaItem | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.list(),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WatchStatus }) =>
      watchlistApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] })
      const previousWatchlist = queryClient.getQueryData<{ items: UserMedia[] }>(['watchlist'])
      if (previousWatchlist) {
        const updated = previousWatchlist.items.map((i) =>
          i.id === id ? { ...i, status } : i
        )
        queryClient.setQueryData(['watchlist'], { items: updated })
      }
      return { previousWatchlist }
    },
    onSuccess: (_, variables) => {
      const statusLabels: Record<WatchStatus, string> = {
        plan_to_watch: 'Quero Ver',
        watching: 'Assistindo',
        completed: 'Já Vi (Concluído)',
        paused: 'Pausado',
        dropped: 'Abandonado',
      }
      showToast(`Movido para "${statusLabels[variables.status]}"!`)
    },
    onError: (err: any, _, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist'], context.previousWatchlist)
      }
      showToast(err?.message || 'Erro ao alterar status')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.toggleFavorite(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] })
      const previousWatchlist = queryClient.getQueryData<{ items: UserMedia[] }>(['watchlist'])
      if (previousWatchlist) {
        const updated = previousWatchlist.items.map((i) =>
          i.id === id ? { ...i, favorite: !i.favorite } : i
        )
        queryClient.setQueryData(['watchlist'], { items: updated })
      }
      return { previousWatchlist }
    },
    onError: (err: any, _, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist'], context.previousWatchlist)
      }
      showToast(err?.message || 'Erro ao atualizar favorito')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] })
      const previousWatchlist = queryClient.getQueryData<{ items: UserMedia[] }>(['watchlist'])
      if (previousWatchlist) {
        const updated = previousWatchlist.items.filter((i) => i.id !== id)
        queryClient.setQueryData(['watchlist'], { items: updated })
      }
      return { previousWatchlist }
    },
    onSuccess: () => {
      showToast('Status e título removidos da sua videoteca!')
    },
    onError: (err: any, _, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist'], context.previousWatchlist)
      }
      showToast(err?.message || 'Erro ao remover título')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const allItems = useMemo(() => data?.items || [], [data?.items])

  // Filtragem combinada: Status/Aba + Tipo (Filme/Série) + Busca
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // 1. Aba de Status
      if (activeTab === 'favorites') {
        if (!item.favorite) return false
      } else if (activeTab !== 'all') {
        if (item.status !== activeTab) return false
      }

      // 2. Filtro de Tipo (filme/série/todos)
      if (typeFilter !== 'all' && item.media?.type !== typeFilter) {
        return false
      }

      // 3. Busca por texto (título, diretor, gênero)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const titleMatch = item.media?.title?.toLowerCase().includes(query)
        const directorMatch = item.media?.director?.toLowerCase().includes(query)
        const genreMatch = item.media?.genres?.toLowerCase().includes(query)
        if (!titleMatch && !directorMatch && !genreMatch) return false
      }

      return true
    })
  }, [allItems, activeTab, typeFilter, searchQuery])

  // Contadores por status respeitando o tipo selecionado
  const typeScopedItems = useMemo(() => {
    if (typeFilter === 'all') return allItems
    return allItems.filter((i) => i.media?.type === typeFilter)
  }, [allItems, typeFilter])

  const totalCount = typeScopedItems.length
  const watchingCount = typeScopedItems.filter((i) => i.status === 'watching').length
  const planCount = typeScopedItems.filter((i) => i.status === 'plan_to_watch').length
  const completedCount = typeScopedItems.filter((i) => i.status === 'completed').length
  const pausedCount = typeScopedItems.filter((i) => i.status === 'paused').length
  const droppedCount = typeScopedItems.filter((i) => i.status === 'dropped').length
  const favCount = typeScopedItems.filter((i) => i.favorite).length

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal de Detalhes da Obra */}
      <MediaDetailsModal
        isOpen={Boolean(selectedUserMedia)}
        onClose={() => setSelectedUserMedia(null)}
        media={selectedUserMedia?.media || undefined}
        userStatus={selectedUserMedia?.status}
        isFavorite={selectedUserMedia?.favorite}
        isUpdating={updateStatusMutation.isPending || toggleFavoriteMutation.isPending}
        onUpdateStatus={(_, status) => {
          if (selectedUserMedia) {
            if (!status) {
              setItemToDelete(selectedUserMedia)
              setSelectedUserMedia(null)
            } else {
              updateStatusMutation.mutate({ id: selectedUserMedia.id, status })
              setSelectedUserMedia({ ...selectedUserMedia, status })
            }
          }
        }}
        onToggleFavorite={() => {
          if (selectedUserMedia) {
            toggleFavoriteMutation.mutate(selectedUserMedia.id)
            setSelectedUserMedia({ ...selectedUserMedia, favorite: !selectedUserMedia.favorite })
          }
        }}
        onLogWatch={() => {
          if (selectedUserMedia?.media) {
            onOpenLogModal(selectedUserMedia.media)
          }
        }}
        onOpenSeriesEvaluation={(media) => {
          if ('id' in media && media.id) {
            setSeriesToEvaluate(media as MediaItem)
          }
        }}
      />

      {/* Modal de Avaliação Hierárquica de Séries */}
      <SeriesEvaluationModal
        isOpen={Boolean(seriesToEvaluate)}
        onClose={() => setSeriesToEvaluate(null)}
        media={seriesToEvaluate || undefined}
      />

      {/* Modal Reutilizável de Confirmação para Remoção de Status */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            deleteMutation.mutate(itemToDelete.id)
            setItemToDelete(null)
          }
        }}
        title="Remover Status da Videoteca"
        description={`Deseja desmarcar o status e remover "${itemToDelete?.media?.title || 'este título'}" da sua videoteca? Suas avaliações e sessões no diário continuarão salvas.`}
        confirmText="Remover status"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-rose-400" />
            <span>Minha Videoteca</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Seus filmes e séries organizados em assistindo, quero ver, já vistos, pausados ou abandonados.
          </p>
        </div>

        <button
          onClick={onNavigateToCatalog}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition cursor-pointer shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Buscar títulos</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca da Videoteca */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Barra de Busca interna */}
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título, diretor ou gênero na sua videoteca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Formato: Todos / Filmes / Séries */}
          <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                typeFilter === 'all'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Todos</span>
            </button>
            <button
              onClick={() => setTypeFilter('movie')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                typeFilter === 'movie'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Filmes</span>
            </button>
            <button
              onClick={() => setTypeFilter('tv')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                typeFilter === 'tv'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Séries</span>
            </button>
          </div>
        </div>
      </div>

      {/* Abas de Status com "Todos" e todas as categorias */}
      <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold overflow-x-auto scrollbar-none gap-1">
        {/* Aba Todos */}
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 min-w-[95px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-slate-700 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Todos</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-white/20' : 'bg-slate-800'}`}>
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('watching')}
          className={`flex-1 min-w-[105px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'watching'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Assistindo</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'watching' ? 'bg-slate-950/20' : 'bg-slate-800'}`}>
            {watchingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('plan_to_watch')}
          className={`flex-1 min-w-[105px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'plan_to_watch'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Quero Ver</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'plan_to_watch' ? 'bg-slate-950/20' : 'bg-slate-800'}`}>
            {planCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 min-w-[105px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'completed'
              ? 'bg-rose-500 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Já Vi</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-white/20' : 'bg-slate-800'}`}>
            {completedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('paused')}
          className={`flex-1 min-w-[105px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'paused'
              ? 'bg-yellow-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pausado</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'paused' ? 'bg-slate-950/20' : 'bg-slate-800'}`}>
            {pausedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dropped')}
          className={`flex-1 min-w-[105px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'dropped'
              ? 'bg-slate-700 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Abandonado</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'dropped' ? 'bg-white/20' : 'bg-slate-800'}`}>
            {droppedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 min-w-[105px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'favorites'
              ? 'bg-rose-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Favoritos</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'favorites' ? 'bg-white/20' : 'bg-slate-800'}`}>
            {favCount}
          </span>
        </button>
      </div>

      {/* Grid de Itens */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const media = item.media
            if (!media) return null
            const isMovie = media.type === 'movie'

            return (
              <div
                key={item.id}
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col shadow-lg"
              >
                {/* Pôster (Clicável para ver detalhes) */}
                <div
                  onClick={() => setSelectedUserMedia(item)}
                  className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden cursor-pointer"
                  title="Clique para ver detalhes da obra"
                >
                  {media.poster_url ? (
                    <img
                      src={media.poster_url}
                      alt={media.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-600">
                      <Tv className="w-10 h-10 mb-2 stroke-1" />
                      <span className="text-xs text-center line-clamp-2">{media.title}</span>
                    </div>
                  )}

                  {/* Badge Tipo (Filme ou Série) */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider backdrop-blur-md bg-slate-950/70 border border-slate-700/50 text-slate-300 flex items-center gap-1">
                    {isMovie ? <Film className="w-2.5 h-2.5 text-rose-400" /> : <Tv className="w-2.5 h-2.5 text-cyan-400" />}
                    <span>{isMovie ? 'Filme' : 'Série'}</span>
                  </div>

                  {/* Favorito */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavoriteMutation.mutate(item.id)
                    }}
                    title={item.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md bg-slate-950/70 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${item.favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  {/* Progresso de Série */}
                  {!isMovie && (item.current_season > 0 || item.current_episode > 0) && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                      T{item.current_season} E{item.current_episode}
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div
                    onClick={() => setSelectedUserMedia(item)}
                    className="cursor-pointer space-y-0.5"
                    title="Clique para ver detalhes da obra"
                  >
                    <h3 className="font-bold text-white text-xs line-clamp-1 group-hover:text-rose-400 transition" title={media.title}>
                      {media.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      {media.year ? <span>{media.year}</span> : null}
                      {media.genres ? (
                        <>
                          <span>•</span>
                          <span className="line-clamp-1">{media.genres.split(',')[0]}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Ações Alinhadas Verticalmente */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80 flex flex-col">
                    {/* Botão Registrar Diário */}
                    <button
                      onClick={() => onOpenLogModal(media)}
                      title="Registrar experiência detalhada com nota e resenha"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 active:scale-95 transition cursor-pointer shadow-md shadow-rose-500/20"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Avaliar no Diário</span>
                    </button>

                    {/* Seletor de Status com opção de Remoção */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={item.status}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'none') {
                            setItemToDelete(item)
                          } else {
                            updateStatusMutation.mutate({
                              id: item.id,
                              status: val as WatchStatus,
                            })
                          }
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="watching">Assistindo</option>
                        <option value="plan_to_watch">Quero Ver</option>
                        <option value="completed">Já Vi</option>
                        <option value="paused">Pausado</option>
                        <option value="dropped">Abandonado</option>
                        <option value="none" className="text-rose-400 font-bold">
                          ✕ Remover status
                        </option>
                      </select>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setItemToDelete(item)
                        }}
                        title="Remover status / desmarcar da videoteca"
                        className="p-2 rounded-xl bg-slate-800/60 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-10 text-center space-y-4">
          <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Nenhum título encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'Nenhum resultado corresponde aos termos da busca.'
                : 'Explore o catálogo para encontrar filmes e séries e organize sua videoteca!'}
            </p>
          </div>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Limpar busca</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToCatalog}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition cursor-pointer shadow-md shadow-rose-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Explorar catálogo</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
