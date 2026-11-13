import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mediaApi } from '@/api/media'
import { watchlistApi } from '@/api/watchlist'
import { MediaCard } from './MediaCard'
import type { MediaItem, ExternalMediaResult } from '@/types/media'
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

  // Lista do usuário para checar itens já adicionados
  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.list(),
  })

  const watchlistMediaIds = new Set<string>(
    watchlistData?.items.map((i) => i.media_id) || []
  )
  const watchlistTmdbIds = new Set<number>(
    watchlistData?.items.map((i) => i.media?.tmdb_id).filter((id): id is number => typeof id === 'number') || []
  )

  // Mutação para adicionar à Watchlist (Assistir mais tarde)
  const addMutation = useMutation({
    mutationFn: async (item: MediaItem | ExternalMediaResult) => {
      // 1. Se for ExternalMediaResult, garante que esteja importado no banco
      let mediaId = 'id' in item ? item.id : ''
      if (!mediaId && 'tmdb_id' in item) {
        const importRes = await mediaApi.import({
          tmdb_id: item.tmdb_id,
          type: item.type,
          title: item.title,
          original_title: item.original_title,
          overview: item.overview,
          poster_url: item.poster_url,
          backdrop_url: item.backdrop_url,
          release_date: item.release_date,
          year: item.year,
          genres: item.genres,
        })
        mediaId = importRes.media.id
      }
      return watchlistApi.add({
        media_id: mediaId,
        status: 'plan_to_watch',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      setToastMsg('Adicionado à lista de assistir mais tarde!')
      setTimeout(() => setToastMsg(null), 3000)
    },
  })

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero / Header de Busca */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>O que você assistiu recentemente?</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Descubra filmes, séries e registre sua experiência
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pesquise por títulos em português ou original, marque o que já viu, avalie com estrelas e crie sua lista de próximos filmes e séries.
          </p>

          {/* Barra de Busca */}
          <div className="relative pt-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Busque por Interestelar, Breaking Bad, Duna, Succession..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
              />
              {isLoading && (
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin absolute right-4" />
              )}
            </div>
          </div>

          {/* Filtros de Tipo */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setSelectedType('')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedType === ''
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedType('movie')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedType === 'movie'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Filmes</span>
            </button>
            <button
              onClick={() => setSelectedType('tv')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedType === 'tv'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Séries</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Resultados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {debouncedQuery ? (
              <>Resultados para "{debouncedQuery}"</>
            ) : (
              <>Títulos em Destaque & Populares</>
            )}
          </h2>
          <span className="text-xs text-slate-500">
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
              const inWatchlist =
                ('id' in item && typeof item.id === 'string' && watchlistMediaIds.has(item.id)) ||
                ('tmdb_id' in item && typeof item.tmdb_id === 'number' && watchlistTmdbIds.has(item.tmdb_id))

              const cardKey = 'id' in item && item.id ? String(item.id) : `tmdb-${item.tmdb_id || idx}-${item.title}`

              return (
                <MediaCard
                  key={cardKey}
                  media={item}
                  isInWatchlist={Boolean(inWatchlist)}
                  onAddToWatchlist={(m) => addMutation.mutate(m)}
                  onLogWatch={(m) => onOpenLogModal(m)}
                />
              )
            })}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <Film className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">Nenhum filme ou série encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente buscar por outro termo ou cadastre o título manualmente no seu diário.
            </p>
            <button
              onClick={() => onOpenLogModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
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
