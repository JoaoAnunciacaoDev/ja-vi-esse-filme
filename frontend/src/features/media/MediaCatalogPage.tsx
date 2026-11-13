import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mediaApi } from '@/api/media'
import { watchlistApi } from '@/api/watchlist'
import { MediaCard } from './MediaCard'
import { MediaDetailsModal } from './MediaDetailsModal'
import { SeriesEvaluationModal } from '@/features/series/SeriesEvaluationModal'
import type { MediaItem, ExternalMediaResult, WatchStatus } from '@/types/media'
import { Search, Film, Tv, Sparkles, Plus, Loader2 } from 'lucide-react'

interface MediaCatalogPageProps {
  onOpenLogModal: (media?: MediaItem | ExternalMediaResult) => void
}

export function MediaCatalogPage({ onOpenLogModal }: MediaCatalogPageProps) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'' | 'movie' | 'tv'>('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [selectedMediaForDetails, setSelectedMediaForDetails] = useState<
    MediaItem | ExternalMediaResult | null
  >(null)
  const [seriesToEvaluate, setSeriesToEvaluate] = useState<MediaItem | null>(null)

  const handleOpenSeriesEvaluation = async (item: MediaItem | ExternalMediaResult) => {
    let mediaItem: MediaItem | null = null
    if ('id' in item && typeof item.id === 'string' && item.id.length > 0) {
      mediaItem = item as MediaItem
    } else {
      try {
        const tmdbIdNum =
          'tmdb_id' in item && typeof item.tmdb_id === 'number' && item.tmdb_id > 0
            ? item.tmdb_id
            : undefined
        const importRes = await mediaApi.import({
          tmdb_id: tmdbIdNum,
          type: item.type || 'tv',
          title: item.title,
          original_title: item.original_title || item.title,
          overview: item.overview || '',
          poster_url: item.poster_url || '',
          backdrop_url: item.backdrop_url || '',
          release_date: item.release_date || '',
          year: item.year || 0,
          genres: item.genres || '',
        })
        if (importRes.media) {
          mediaItem = importRes.media
        }
      } catch (err: any) {
        setToastMsg('Erro ao carregar dados da série: ' + (err?.message || ''))
        setTimeout(() => setToastMsg(null), 3000)
        return
      }
    }

    if (mediaItem) {
      setSeriesToEvaluate(mediaItem)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim())
    }, 350)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Busca de mídias (TMDB / Banco local)
  const { data, isLoading } = useQuery({
    queryKey: ['media-search', debouncedQuery, selectedType],
    queryFn: () => mediaApi.searchExternal(debouncedQuery, selectedType || undefined),
    staleTime: 1000 * 60 * 5,
  })

  // Lista do usuário para checar itens já adicionados e seu status atual
  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.list(),
  })

  // Mapeia media_id -> UserMedia e tmdb_id -> UserMedia
  const userMediaByMediaId = new Map<string, WatchStatus>()
  const userMediaByTmdbId = new Map<number, WatchStatus>()
  const userFavoriteByMediaId = new Map<string, boolean>()
  const userFavoriteByTmdbId = new Map<number, boolean>()

  for (const item of watchlistData?.items || []) {
    userMediaByMediaId.set(item.media_id, item.status)
    userFavoriteByMediaId.set(item.media_id, item.favorite)
    if (item.media?.tmdb_id) {
      userMediaByTmdbId.set(item.media.tmdb_id, item.status)
      userFavoriteByTmdbId.set(item.media.tmdb_id, item.favorite)
    }
  }

  // Mutação para atualizar ou definir status de acompanhamento
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      item,
      status,
    }: {
      item: MediaItem | ExternalMediaResult
      status: WatchStatus
    }) => {
      // 1. Verifica se já temos esse item na watchlist do usuário (prioriza tmdb_id para não colidir títulos iguais)
      const existingInWatchlist = watchlistData?.items?.find((i) => {
        if ('tmdb_id' in item && typeof item.tmdb_id === 'number' && item.tmdb_id > 0) {
          return i.media?.tmdb_id === item.tmdb_id
        }
        if ('id' in item && item.id) {
          return i.media_id === item.id
        }
        return false
      })

      if (existingInWatchlist) {
        return watchlistApi.update(existingInWatchlist.id, { status })
      }

      // 2. Se for ExternalMediaResult ou não tiver id persistido no banco, garante que esteja importado
      let mediaId = 'id' in item && typeof item.id === 'string' && item.id.length > 0 ? item.id : ''
      if (!mediaId) {
        const tmdbIdNum = 'tmdb_id' in item && typeof item.tmdb_id === 'number' && item.tmdb_id > 0 ? item.tmdb_id : undefined
        const importRes = await mediaApi.import({
          tmdb_id: tmdbIdNum,
          type: item.type || 'movie',
          title: item.title,
          original_title: item.original_title || item.title,
          overview: item.overview || '',
          poster_url: item.poster_url || '',
          backdrop_url: item.backdrop_url || '',
          release_date: item.release_date || '',
          year: item.year || 0,
          genres: item.genres || '',
        })
        mediaId = importRes.media?.id || ''
      }

      if (!mediaId) {
        throw new Error('Não foi possível identificar a mídia para salvar.')
      }

      // 3. Adiciona à videoteca
      return watchlistApi.add({
        media_id: mediaId,
        status,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      const statusLabels: Record<WatchStatus, string> = {
        plan_to_watch: 'Quero Ver',
        watching: 'Assistindo',
        completed: 'Já Vi (Concluído)',
        paused: 'Pausado',
        dropped: 'Abandonado',
      }
      setToastMsg(`Status alterado para "${statusLabels[variables.status]}"!`)
      setTimeout(() => setToastMsg(null), 3000)
    },
    onError: (err: any) => {
      console.error('Falha ao atualizar status:', err)
      let message = err?.message || 'Erro ao alterar status.'
      if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('não autorizado')) {
        message = 'Você precisa estar conectado na sua conta para salvar filmes.'
      }
      setToastMsg(message)
      setTimeout(() => setToastMsg(null), 4000)
    },
  })

  // Mutação para favoritar / desfavoritar rapidamente
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (item: MediaItem | ExternalMediaResult) => {
      const existingInWatchlist = watchlistData?.items?.find((i) => {
        if ('tmdb_id' in item && typeof item.tmdb_id === 'number' && item.tmdb_id > 0) {
          return i.media?.tmdb_id === item.tmdb_id
        }
        if ('id' in item && item.id) {
          return i.media_id === item.id
        }
        return false
      })

      if (existingInWatchlist) {
        return watchlistApi.toggleFavorite(existingInWatchlist.id)
      }

      // Se não estiver na lista, importa se necessário e adiciona com favorite = true
      let mediaId = 'id' in item && typeof item.id === 'string' && item.id.length > 0 ? item.id : ''
      if (!mediaId) {
        const tmdbIdNum = 'tmdb_id' in item && typeof item.tmdb_id === 'number' && item.tmdb_id > 0 ? item.tmdb_id : undefined
        const importRes = await mediaApi.import({
          tmdb_id: tmdbIdNum,
          type: item.type || 'movie',
          title: item.title,
          original_title: item.original_title || item.title,
          overview: item.overview || '',
          poster_url: item.poster_url || '',
          backdrop_url: item.backdrop_url || '',
          release_date: item.release_date || '',
          year: item.year || 0,
          genres: item.genres || '',
        })
        mediaId = importRes.media?.id || ''
      }

      if (!mediaId) {
        throw new Error('Não foi possível identificar a mídia para favoritar.')
      }

      return watchlistApi.add({
        media_id: mediaId,
        status: 'plan_to_watch',
        favorite: true,
      })
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      const isFavNow = (res as any)?.favorite ?? true
      setToastMsg(
        isFavNow
          ? `"${variables.title}" adicionado aos favoritos!`
          : `"${variables.title}" removido dos favoritos!`
      )
      setTimeout(() => setToastMsg(null), 3000)
    },
    onError: (err: any) => {
      console.error('Falha ao favoritar:', err)
      let message = err?.message || 'Erro ao favoritar.'
      if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('não autorizado')) {
        message = 'Você precisa estar conectado na sua conta para favoritar.'
      }
      setToastMsg(message)
      setTimeout(() => setToastMsg(null), 4000)
    },
  })

  // Detalhes do item selecionado no modal
  let selectedStatus: WatchStatus | undefined
  let selectedIsFavorite = false

  if (selectedMediaForDetails) {
    if ('id' in selectedMediaForDetails && selectedMediaForDetails.id && userMediaByMediaId.has(selectedMediaForDetails.id)) {
      selectedStatus = userMediaByMediaId.get(selectedMediaForDetails.id)
      selectedIsFavorite = Boolean(userFavoriteByMediaId.get(selectedMediaForDetails.id))
    } else if ('tmdb_id' in selectedMediaForDetails && selectedMediaForDetails.tmdb_id && userMediaByTmdbId.has(selectedMediaForDetails.tmdb_id)) {
      selectedStatus = userMediaByTmdbId.get(selectedMediaForDetails.tmdb_id)
      selectedIsFavorite = Boolean(userFavoriteByTmdbId.get(selectedMediaForDetails.tmdb_id))
    }
  }

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
        isOpen={Boolean(selectedMediaForDetails)}
        onClose={() => setSelectedMediaForDetails(null)}
        media={selectedMediaForDetails || undefined}
        userStatus={selectedStatus}
        isFavorite={selectedIsFavorite}
        isUpdating={updateStatusMutation.isPending || toggleFavoriteMutation.isPending}
        onUpdateStatus={(m, s) => updateStatusMutation.mutate({ item: m, status: s })}
        onToggleFavorite={(m) => toggleFavoriteMutation.mutate(m)}
        onLogWatch={(m) => onOpenLogModal(m)}
        onOpenSeriesEvaluation={(m) => handleOpenSeriesEvaluation(m)}
      />

      {/* Modal de Avaliação Hierárquica de Séries */}
      <SeriesEvaluationModal
        isOpen={Boolean(seriesToEvaluate)}
        onClose={() => setSeriesToEvaluate(null)}
        media={seriesToEvaluate || undefined}
      />

      {/* Hero / Header de Busca */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>O que você assistiu recentemente?</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Descubra filmes, séries e organize seu acervo
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pesquise por títulos em português ou original, marque o que está assistindo, o que pausou, abandonou ou planeja ver.
          </p>

          {/* Barra de Pesquisa */}
          <div className="relative pt-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busque por filme, série, diretor ou elenco..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition shadow-inner"
              />
              {isLoading && (
                <Loader2 className="w-5 h-5 text-rose-400 animate-spin absolute right-4" />
              )}
            </div>

            {/* Filtros de Tipo */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setSelectedType('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedType === ''
                    ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedType('movie')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedType === 'movie'
                    ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Filmes</span>
              </button>
              <button
                onClick={() => setSelectedType('tv')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedType === 'tv'
                    ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Séries</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Resultados ou Destaques */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              {debouncedQuery ? `Resultados para "${debouncedQuery}"` : 'Em Alta nesta Semana'}
            </h2>
            {!debouncedQuery && (
              <p className="text-xs text-slate-400 mt-0.5">
                Os títulos mais populares e assistidos do momento
              </p>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {data?.results ? `${data.results.length} títulos` : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-slate-900 border border-slate-800 rounded-2xl" />
            ))}
          </div>
        ) : data?.results && data.results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.results.map((item, idx) => {
              let currentStatus: WatchStatus | undefined
              let isFav = false

              if ('id' in item && typeof item.id === 'string' && userMediaByMediaId.has(item.id)) {
                currentStatus = userMediaByMediaId.get(item.id)
                isFav = Boolean(userFavoriteByMediaId.get(item.id))
              } else if ('tmdb_id' in item && typeof item.tmdb_id === 'number' && userMediaByTmdbId.has(item.tmdb_id)) {
                currentStatus = userMediaByTmdbId.get(item.tmdb_id)
                isFav = Boolean(userFavoriteByTmdbId.get(item.tmdb_id))
              }

              const cardKey =
                'tmdb_id' in item && typeof item.tmdb_id === 'number' && item.tmdb_id > 0
                  ? `tmdb-${item.tmdb_id}`
                  : 'id' in item && item.id
                  ? String(item.id)
                  : `media-${idx}-${item.title}-${item.year || ''}`

              const isItemUpdating =
                updateStatusMutation.isPending &&
                (updateStatusMutation.variables?.item === item ||
                  ('tmdb_id' in item &&
                    Boolean(item.tmdb_id) &&
                    (updateStatusMutation.variables?.item as any)?.tmdb_id === item.tmdb_id))

              return (
                <MediaCard
                  key={cardKey}
                  media={item}
                  userStatus={currentStatus}
                  isFavorite={isFav}
                  isUpdating={isItemUpdating}
                  onUpdateStatus={(m, s) => updateStatusMutation.mutate({ item: m, status: s })}
                  onToggleFavorite={(m) => toggleFavoriteMutation.mutate(m)}
                  onLogWatch={(m) => onOpenLogModal(m)}
                  onOpenDetails={(m) => setSelectedMediaForDetails(m)}
                />
              )
            })}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <Film className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">Nenhum filme ou série encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente buscar por outro termo ou registre manualmente no seu diário.
            </p>
            <button
              onClick={() => onOpenLogModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar experiência</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
