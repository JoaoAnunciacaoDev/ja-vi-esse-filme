import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { watchLogsApi } from '@/api/watchLogs'
import { mediaApi } from '@/api/media'
import type { MediaItem, ExternalMediaResult } from '@/types/media'
import { triggerConfetti } from '@/components/ui/confetti'
import { X, Star, Calendar, Film, Tv, Sparkles, Loader2, AlertCircle } from 'lucide-react'

interface LogMediaModalProps {
  isOpen: boolean
  onClose: () => void
  initialMedia?: MediaItem | ExternalMediaResult
}

const PLATFORMS = [
  'Cinema',
  'Netflix',
  'Prime Video',
  'Max',
  'Disney+',
  'Apple TV+',
  'Globoplay',
  'Outro',
]

export function LogMediaModal({ isOpen, onClose, initialMedia }: LogMediaModalProps) {
  const queryClient = useQueryClient()

  const [media, setMedia] = useState<MediaItem | ExternalMediaResult | undefined>(initialMedia)
  const [watchedAt, setWatchedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [seasonNumber, setSeasonNumber] = useState(0)
  const [episodeNumber, setEpisodeNumber] = useState(0)
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [platform, setPlatform] = useState('Netflix')
  const [isRewatch, setIsRewatch] = useState(false)
  const [rating, setRating] = useState(4.0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState('')
  const [containsSpoilers, setContainsSpoilers] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (initialMedia) {
      setMedia(initialMedia)
    }
  }, [initialMedia])

  const createLogMutation = useMutation({
    mutationFn: async () => {
      if (!media) throw new Error('Selecione um filme ou série para registrar')

      // Garante que a mídia está salva no banco
      let mediaId = 'id' in media ? media.id : ''
      if (!mediaId && 'tmdb_id' in media) {
        const importRes = await mediaApi.import({
          tmdb_id: media.tmdb_id,
          type: media.type,
          title: media.title,
          original_title: media.original_title,
          overview: media.overview,
          poster_url: media.poster_url,
          backdrop_url: media.backdrop_url,
          release_date: media.release_date,
          year: media.year,
          genres: media.genres,
        })
        mediaId = importRes.media.id
      }

      return watchLogsApi.create({
        media_id: mediaId,
        watched_at: watchedAt,
        media_type: media.type,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        episode_title: episodeTitle.trim() || undefined,
        platform,
        is_rewatch: isRewatch,
        rating,
        review: review.trim() || undefined,
        contains_spoilers: containsSpoilers,
      })
    },
    onSuccess: () => {
      triggerConfetti()
      queryClient.invalidateQueries({ queryKey: ['watch-logs'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['stats-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['social-feed'] })
      onClose()
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Erro ao registrar experiência')
    },
  })

  if (!isOpen) return null

  const isSeries = media?.type === 'tv'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Título do Modal */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Já Vi Esse Filme!</h2>
            <p className="text-xs text-slate-400">Registre sua sessão, avalie e guarde suas impressões.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mídia Selecionada */}
        {media ? (
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            {media.poster_url ? (
              <img
                src={media.poster_url}
                alt={media.title}
                className="w-12 h-16 object-cover rounded-xl shrink-0"
              />
            ) : (
              <div className="w-12 h-16 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 text-slate-500">
                {isSeries ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 mb-1">
                {isSeries ? 'Série' : 'Filme'}
              </div>
              <h3 className="font-bold text-white text-sm truncate">{media.title}</h3>
              {media.year ? <p className="text-xs text-slate-500">{media.year}</p> : null}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-400">
            Nenhuma mídia selecionada. Selecione um filme no catálogo primeiro.
          </div>
        )}

        {/* Data que assistiu */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quando assistiu?</span>
          </label>
          <input
            type="date"
            value={watchedAt}
            onChange={(e) => setWatchedAt(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Se for Série: Temporada e Episódio */}
        {isSeries && (
          <div className="space-y-2 p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-cyan-300">Temporada</label>
                <input
                  type="number"
                  min="0"
                  value={seasonNumber}
                  onChange={(e) => setSeasonNumber(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Ex: 1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-cyan-300">Episódio</label>
                <input
                  type="number"
                  min="0"
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Ex: 4"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-cyan-300">Título do Episódio (opcional)</label>
              <input
                type="text"
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                placeholder="Ex: O Casamento Vermelho"
              />
            </div>
          </div>
        )}

        {/* Onde assistiu (Plataforma) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Onde assistiu?</label>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  platform === p
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Avaliação em Estrelas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Sua nota</label>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{hoverRating || rating} / 5</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 py-1">
            {[1, 2, 3, 4, 5].map((starValue) => {
              const activeVal = hoverRating || rating
              const isFilled = activeVal >= starValue
              return (
                <button
                  key={starValue}
                  type="button"
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(starValue)}
                  className="p-1 text-slate-600 hover:scale-125 transition cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'text-slate-700 hover:text-slate-500'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* Já tinha assistido antes? (Rewatch) */}
        <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 cursor-pointer">
          <input
            type="checkbox"
            checked={isRewatch}
            onChange={(e) => setIsRewatch(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
          />
          <div className="text-xs">
            <span className="font-semibold text-white block">Já tinha assistido antes (Rewatch)</span>
            <span className="text-slate-500">Acumule avaliações e compare suas impressões ao longo do tempo.</span>
          </div>
        </label>

        {/* Resenha / Comentário */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Resenha / O que achou?</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            placeholder="Conte o que achou da experiência, atuações, direção, reviravoltas..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition resize-none"
          />
        </div>

        {/* Spoiler Toggle */}
        {review.trim().length > 0 && (
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={containsSpoilers}
              onChange={(e) => setContainsSpoilers(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500"
            />
            <span>Marcar resenha como contendo spoilers</span>
          </label>
        )}

        {/* Botão de Envio */}
        <button
          onClick={() => createLogMutation.mutate()}
          disabled={!media || createLogMutation.isPending}
          className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-98 transition disabled:opacity-50 cursor-pointer shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {createLogMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando sessão...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Salvar no meu Diário</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
