import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { watchLogsApi } from '@/api/watchLogs'
import { mediaApi } from '@/api/media'
import type { MediaItem, ExternalMediaResult } from '@/types/media'
import { triggerConfetti } from '@/components/ui/confetti'
import {
  X,
  Star,
  Calendar,
  Film,
  Tv,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react'

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

type DateMode = 'exact' | 'year' | 'unknown'

export function LogMediaModal({ isOpen, onClose, initialMedia }: LogMediaModalProps) {
  const queryClient = useQueryClient()

  const [media, setMedia] = useState<MediaItem | ExternalMediaResult | undefined>(initialMedia)
  const [dateMode, setDateMode] = useState<DateMode>('exact')
  const [watchedDate, setWatchedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [watchedYear, setWatchedYear] = useState(() => new Date().getFullYear().toString())

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

  // Busca rápida de filme dentro do modal caso tenha aberto sem mídia selecionada
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExternalMediaResult[]>([])
  const [isSearchingMedia, setIsSearchingMedia] = useState(false)

  // Reseta estado sempre que o modal abre ou initialMedia muda
  useEffect(() => {
    if (isOpen) {
      setMedia(initialMedia)
      setDateMode('exact')
      setWatchedDate(new Date().toISOString().split('T')[0])
      setWatchedYear(new Date().getFullYear().toString())
      setSeasonNumber(0)
      setEpisodeNumber(0)
      setEpisodeTitle('')
      setPlatform('Netflix')
      setIsRewatch(false)
      setRating(4.0)
      setHoverRating(0)
      setReview('')
      setContainsSpoilers(false)
      setErrorMsg(null)
      setMediaSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen, initialMedia])

  // Busca de mídias quando o usuário digita na busca interna do modal
  useEffect(() => {
    if (!media && mediaSearchQuery.trim().length >= 2) {
      setIsSearchingMedia(true)
      const handler = setTimeout(async () => {
        try {
          const res = await mediaApi.searchExternal(mediaSearchQuery.trim())
          setSearchResults(res.results || [])
        } catch {
          setSearchResults([])
        } finally {
          setIsSearchingMedia(false)
        }
      }, 350)
      return () => clearTimeout(handler)
    } else {
      setSearchResults([])
      setIsSearchingMedia(false)
    }
  }, [media, mediaSearchQuery])

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

      // Calcula o formato da data conforme escolha do usuário
      let finalWatchedAt = ''
      if (dateMode === 'exact') {
        finalWatchedAt = watchedDate || new Date().toISOString().split('T')[0]
      } else if (dateMode === 'year') {
        const y = parseInt(watchedYear) || new Date().getFullYear()
        finalWatchedAt = `${y}-01-01`
      } else {
        // 'unknown' -> salva a data atual para ordenação, mas o log fica gravado
        finalWatchedAt = new Date().toISOString().split('T')[0]
      }

      return watchLogsApi.create({
        media_id: mediaId,
        watched_at: finalWatchedAt,
        media_type: media.type,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        episode_title: episodeTitle.trim() || undefined,
        platform: dateMode === 'unknown' ? platform : platform,
        is_rewatch: isRewatch,
        rating,
        review: review.trim() || undefined,
        contains_spoilers: containsSpoilers,
      })
    },
    onSuccess: () => {
      triggerConfetti()
      queryClient.invalidateQueries({ queryKey: ['watch-logs'] })
      queryClient.invalidateQueries({ queryKey: ['watch-logs-summary'] })
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
          <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl">
            <Film className="w-6 h-6" />
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

        {/* Mídia Selecionada ou Campo de Busca */}
        {media ? (
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl relative">
            {media.poster_url ? (
              <img
                src={media.poster_url}
                alt={media.title}
                className="w-12 h-16 object-cover rounded-xl shrink-0 shadow-md"
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

            {/* Trocar filme */}
            <button
              type="button"
              onClick={() => setMedia(undefined)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
            >
              Trocar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-rose-400" />
              <span>Qual filme ou série você assistiu?</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={mediaSearchQuery}
                onChange={(e) => setMediaSearchQuery(e.target.value)}
                placeholder="Digite o nome (ex: Interestelar, Breaking Bad)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
              {isSearchingMedia && (
                <Loader2 className="w-4 h-4 text-rose-400 animate-spin absolute right-3.5 top-3" />
              )}
            </div>

            {/* Resultados da busca rápida */}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950 divide-y divide-slate-800/60">
                {searchResults.map((item, idx) => {
                  const key = 'id' in item && typeof item.id === 'string' ? item.id : `search-${item.tmdb_id || idx}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setMedia(item)
                        setSearchResults([])
                        setMediaSearchQuery('')
                      }}
                      className="w-full p-2.5 text-left flex items-center gap-3 hover:bg-slate-800/50 transition cursor-pointer"
                    >
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-8 h-11 object-cover rounded-md shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-11 bg-slate-800 rounded flex items-center justify-center shrink-0 text-slate-500">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <span className="text-[10px] text-slate-400">
                        {item.type === 'tv' ? 'Série' : 'Filme'} {item.year ? `• ${item.year}` : ''}
                      </span>
                    </div>
                  </button>
                )
              })}
              </div>
            )}
          </div>
        )}

        {/* Escolha da Data (Data exata, Somente o ano, ou Não lembro/Só marcar que vi) */}
        <div className="space-y-2 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>Quando assistiu?</span>
            </label>

            {/* Seletores de modo de data */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setDateMode('exact')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  dateMode === 'exact'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Data exata
              </button>
              <button
                type="button"
                onClick={() => setDateMode('year')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  dateMode === 'year'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Só o ano
              </button>
              <button
                type="button"
                onClick={() => setDateMode('unknown')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  dateMode === 'unknown'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Não lembro
              </button>
            </div>
          </div>

          {/* Campo de Data conforme modo */}
          {dateMode === 'exact' && (
            <input
              type="date"
              value={watchedDate}
              onChange={(e) => setWatchedDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition"
            />
          )}

          {dateMode === 'year' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={watchedYear}
                onChange={(e) => setWatchedYear(e.target.value)}
                placeholder="Ex: 2018"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition"
              />
              <span className="text-[11px] text-slate-500 shrink-0">Ano aproximado</span>
            </div>
          )}

          {dateMode === 'unknown' && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
              <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Sem problemas! Vamos registrar apenas que você já assistiu.</span>
            </div>
          )}
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
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* É Revisita? (Rewatch) */}
        <label className="flex items-center gap-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition">
          <input
            type="checkbox"
            checked={isRewatch}
            onChange={(e) => setIsRewatch(e.target.checked)}
            className="w-4 h-4 rounded text-rose-500 accent-rose-500"
          />
          <div className="text-xs">
            <span className="font-semibold text-white">Já tinha visto antes (Reassistindo / Rewatch)</span>
            <p className="text-[11px] text-slate-400">Você pode dar notas e resenhas diferentes a cada revisita!</p>
          </div>
        </label>

        {/* Avaliação por Estrelas (0.5 a 5.0) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Sua Nota</label>
            <span className="text-sm font-extrabold text-amber-400 flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{hoverRating > 0 ? hoverRating.toFixed(1) : rating > 0 ? rating.toFixed(1) : 'Sem nota'}</span>
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 py-2 bg-slate-950/60 border border-slate-800 rounded-2xl">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1.5 transition-transform hover:scale-125 cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    (hoverRating || rating) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Resenha / Texto */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Resenha / O que achou?</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            placeholder="Conte o que achou da experiência, atuações, direção, reviravoltas..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition resize-none"
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
          className="w-full py-3.5 rounded-2xl font-bold text-sm bg-rose-500 text-white hover:bg-rose-400 active:scale-98 transition disabled:opacity-50 cursor-pointer shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2"
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
