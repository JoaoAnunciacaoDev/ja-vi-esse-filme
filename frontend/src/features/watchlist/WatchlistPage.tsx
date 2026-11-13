import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { watchlistApi } from '@/api/watchlist'
import type { WatchStatus, MediaItem } from '@/types/media'
import {
  Bookmark,
  Tv,
  Check,
  Trash2,
  Heart,
  Plus,
  Loader2,
  Play,
  Pause,
  XCircle,
  Sparkles,
} from 'lucide-react'

interface WatchlistPageProps {
  onOpenLogModal: (media?: MediaItem) => void
  onNavigateToCatalog: () => void
}

export function WatchlistPage({ onOpenLogModal, onNavigateToCatalog }: WatchlistPageProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<WatchStatus | 'favorites'>('watching')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      const statusLabels: Record<WatchStatus, string> = {
        plan_to_watch: 'Quero Ver',
        watching: 'Assistindo',
        completed: 'Já Vi (Concluído)',
        paused: 'Pausado',
        dropped: 'Abandonado',
      }
      showToast(`Movido para "${statusLabels[variables.status]}"!`)
    },
    onError: (err: any) => {
      showToast(err?.message || 'Erro ao alterar status')
    },
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.toggleFavorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const allItems = data?.items || []

  const filteredItems = allItems.filter((item) => {
    if (activeTab === 'favorites') return item.favorite
    return item.status === activeTab
  })

  const watchingCount = allItems.filter((i) => i.status === 'watching').length
  const planCount = allItems.filter((i) => i.status === 'plan_to_watch').length
  const completedCount = allItems.filter((i) => i.status === 'completed').length
  const pausedCount = allItems.filter((i) => i.status === 'paused').length
  const droppedCount = allItems.filter((i) => i.status === 'dropped').length
  const favCount = allItems.filter((i) => i.favorite).length

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

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

      {/* Abas de Status com todas as categorias solicitadas */}
      <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => setActiveTab('watching')}
          className={`flex-1 min-w-[110px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
          className={`flex-1 min-w-[110px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
          className={`flex-1 min-w-[110px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
          className={`flex-1 min-w-[110px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
          className={`flex-1 min-w-[110px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
          className={`flex-1 min-w-[110px] py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                {/* Pôster */}
                <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
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

                  {/* Favorito */}
                  <button
                    onClick={() => toggleFavoriteMutation.mutate(item.id)}
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
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-bold text-white text-xs line-clamp-1 group-hover:text-rose-400 transition" title={media.title}>
                      {media.title}
                    </h3>
                    {media.year ? (
                      <span className="text-[11px] text-slate-500">{media.year}</span>
                    ) : null}
                  </div>

                  {/* Seletor rápido de Status no Card */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            id: item.id,
                            status: e.target.value as WatchStatus,
                          })
                        }
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="watching">Assistindo</option>
                        <option value="plan_to_watch">Quero Ver</option>
                        <option value="completed">Já Vi</option>
                        <option value="paused">Pausado</option>
                        <option value="dropped">Abandonado</option>
                      </select>

                      <button
                        onClick={() => {
                          if (confirm(`Remover "${media.title}" da sua videoteca?`)) {
                            deleteMutation.mutate(item.id)
                          }
                        }}
                        title="Remover da lista"
                        className="p-1 rounded-lg bg-slate-800/60 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Botão Registrar Sessão com Detalhes */}
                    <button
                      onClick={() => onOpenLogModal(media)}
                      title="Registrar experiência detalhada com nota e resenha"
                      className="w-full inline-flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Avaliar / Registrar</span>
                    </button>
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
            <h3 className="text-sm font-bold text-white">Nenhum título nesta categoria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Explore o catálogo para encontrar filmes e séries e organize o que está assistindo ou planeja ver!
            </p>
          </div>
          <button
            onClick={onNavigateToCatalog}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition cursor-pointer shadow-md shadow-rose-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Explorar catálogo</span>
          </button>
        </div>
      )}
    </div>
  )
}
