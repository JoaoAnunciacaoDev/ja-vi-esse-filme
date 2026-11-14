import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { watchLogsApi } from '@/api/watchLogs'
import { mediaApi } from '@/api/media'
import { RatingStarsInput } from '@/components/ui/RatingStarsInput'
import { RichReviewEditor } from '@/components/ui/RichReviewEditor'
import { formatDateDDMMYYYY, extractDateOnly, getLocalTodayDateString } from '@/utils/date'
import type { MediaItem, ExternalMediaResult, WatchLog } from '@/types/media'
import { triggerConfetti } from '@/components/ui/confetti'
import {
  X,
  Calendar,
  Film,
  Tv,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  Search,
  CheckCircle2,
  RotateCcw,
  Pencil,
} from 'lucide-react'

interface LogMediaModalProps {
  isOpen: boolean
  onClose: () => void
  initialMedia?: MediaItem | ExternalMediaResult
  initialLog?: WatchLog
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

export function LogMediaModal({ isOpen, onClose, initialMedia, initialLog }: LogMediaModalProps) {
  const queryClient = useQueryClient()

  const [media, setMedia] = useState<MediaItem | ExternalMediaResult | undefined>(initialMedia)
  const [existingLogId, setExistingLogId] = useState<string | null>(initialLog?.id || null)
  const [isExistingLoaded, setIsExistingLoaded] = useState(false)
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)
  const [savedLogDate, setSavedLogDate] = useState<string | null>(null)

  const [dateMode, setDateMode] = useState<DateMode>('exact')
  const [watchedDate, setWatchedDate] = useState(() => getLocalTodayDateString())
  const [watchedYear, setWatchedYear] = useState(() => new Date().getFullYear().toString())

  const [seasonNumber, setSeasonNumber] = useState(0)
  const [episodeNumber, setEpisodeNumber] = useState(0)
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [platform, setPlatform] = useState('Cinema')
  const [isRewatch, setIsRewatch] = useState(false)
  const [rating, setRating] = useState<number | null>(4.0)
  const [review, setReview] = useState('')
  const [containsSpoilers, setContainsSpoilers] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Busca rápida de filme dentro do modal caso tenha aberto sem mídia selecionada
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExternalMediaResult[]>([])
  const [isSearchingMedia, setIsSearchingMedia] = useState(false)

  // Identificador da mídia atual para carregar avaliação salva
  const mediaKey = initialLog?.id
    ? `log-${initialLog.id}`
    : media
    ? ('id' in media && media.id ? `id-${media.id}` : 'tmdb_id' in media && media.tmdb_id ? `tmdb-${media.tmdb_id}` : `title-${media.title}`)
    : initialMedia
    ? ('id' in initialMedia && initialMedia.id ? `id-${initialMedia.id}` : 'tmdb_id' in initialMedia && initialMedia.tmdb_id ? `tmdb-${initialMedia.tmdb_id}` : `title-${initialMedia.title}`)
    : 'empty'

  // Carrega os dados da mídia e, caso já tenha sido avaliada, carrega a avaliação existente
  useEffect(() => {
    if (!isOpen) return

    // 1. Se foi passado um log específico para edição direta
    if (initialLog) {
      setMedia(initialLog.media)
      setExistingLogId(initialLog.id)
      setIsExistingLoaded(true)
      setSavedLogDate(initialLog.watched_at)
      const cleanDate = extractDateOnly(initialLog.watched_at) || initialLog.watched_at
      setWatchedDate(cleanDate || getLocalTodayDateString())
      if (cleanDate && cleanDate.length >= 4) {
        setWatchedYear(cleanDate.split('-')[0])
      }
      setDateMode('exact')
      setRating(typeof initialLog.rating === 'number' ? initialLog.rating : null)
      setReview(initialLog.review || '')
      setPlatform(initialLog.platform || 'Cinema')
      setIsRewatch(Boolean(initialLog.is_rewatch))
      setContainsSpoilers(Boolean(initialLog.contains_spoilers))
      setSeasonNumber(initialLog.season_number || 0)
      setEpisodeNumber(initialLog.episode_number || 0)
      setEpisodeTitle(initialLog.episode_title || '')
      setErrorMsg(null)
      setIsLoadingExisting(false)
      return
    }

    const currentMedia = initialMedia || media

    // 2. Se nenhuma mídia foi selecionada ainda
    if (!currentMedia) {
      setMedia(undefined)
      setExistingLogId(null)
      setIsExistingLoaded(false)
      setSavedLogDate(null)
      setDateMode('exact')
      setWatchedDate(getLocalTodayDateString())
      setWatchedYear(new Date().getFullYear().toString())
      setSeasonNumber(0)
      setEpisodeNumber(0)
      setEpisodeTitle('')
      setPlatform('Cinema')
      setIsRewatch(false)
      setRating(4.0)
      setReview('')
      setContainsSpoilers(false)
      setErrorMsg(null)
      setIsLoadingExisting(false)
      return
    }

    // 3. Uma mídia foi fornecida: busca no banco se já existe avaliação prévia salva
    let isCancelled = false
    setIsLoadingExisting(true)

    const loadExistingEvaluation = async () => {
      try {
        let targetMediaId = 'id' in currentMedia && typeof currentMedia.id === 'string' && currentMedia.id.length > 0
          ? currentMedia.id
          : ''

        // Se for ExternalMediaResult sem id, importa ou recupera o ID persistido no banco
        if (!targetMediaId && 'tmdb_id' in currentMedia && typeof currentMedia.tmdb_id === 'number' && currentMedia.tmdb_id > 0) {
          const importRes = await mediaApi.import({
            tmdb_id: currentMedia.tmdb_id,
            type: currentMedia.type,
            title: currentMedia.title,
            original_title: currentMedia.original_title,
            overview: currentMedia.overview,
            poster_url: currentMedia.poster_url,
            backdrop_url: currentMedia.backdrop_url,
            release_date: currentMedia.release_date,
            year: currentMedia.year,
            genres: currentMedia.genres,
          })
          if (importRes.media?.id) {
            targetMediaId = importRes.media.id
            if (!isCancelled) {
              setMedia(importRes.media)
            }
          }
        } else if (!isCancelled) {
          setMedia(currentMedia)
        }

        if (targetMediaId) {
          const res = await watchLogsApi.list({ media_id: targetMediaId, limit: 1 })
          if (isCancelled) return

          if (res.items && res.items.length > 0) {
            const existing = res.items[0]
            setExistingLogId(existing.id)
            setIsExistingLoaded(true)
            setSavedLogDate(existing.watched_at)

            const cleanDate = extractDateOnly(existing.watched_at) || existing.watched_at
            setWatchedDate(cleanDate || getLocalTodayDateString())
            if (cleanDate && cleanDate.length >= 4) {
              setWatchedYear(cleanDate.split('-')[0])
            }
            setDateMode('exact')
            setRating(typeof existing.rating === 'number' ? existing.rating : null)
            setReview(existing.review || '')
            setPlatform(existing.platform || 'Cinema')
            setIsRewatch(Boolean(existing.is_rewatch))
            setContainsSpoilers(Boolean(existing.contains_spoilers))
            setSeasonNumber(existing.season_number || 0)
            setEpisodeNumber(existing.episode_number || 0)
            setEpisodeTitle(existing.episode_title || '')
            setErrorMsg(null)
            setIsLoadingExisting(false)
            return
          }
        }

        // Se não possui avaliação prévia, define valores padrão para nova entrada
        if (!isCancelled) {
          setExistingLogId(null)
          setIsExistingLoaded(false)
          setSavedLogDate(null)
          setDateMode('exact')
          setWatchedDate(getLocalTodayDateString())
          setWatchedYear(new Date().getFullYear().toString())
          setSeasonNumber(0)
          setEpisodeNumber(0)
          setEpisodeTitle('')
          setPlatform('Cinema')
          setIsRewatch(false)
          setRating(4.0)
          setReview('')
          setContainsSpoilers(false)
          setErrorMsg(null)
        }
      } catch (err: any) {
        console.warn('Erro ao carregar avaliação prévia da mídia:', err)
      } finally {
        if (!isCancelled) {
          setIsLoadingExisting(false)
        }
      }
    }

    loadExistingEvaluation()

    return () => {
      isCancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mediaKey])

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

  // Salvar (Atualizar existente ou Criar novo registro)
  const saveLogMutation = useMutation({
    mutationFn: async () => {
      if (!media) throw new Error('Selecione um filme ou série para registrar')

      // Garante que a mídia está salva no banco
      let mediaId = 'id' in media && typeof media.id === 'string' && media.id.length > 0 ? media.id : ''
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

      // Formato da data conforme o modo escolhido
      let finalWatchedAt = ''
      if (dateMode === 'exact') {
        finalWatchedAt = watchedDate || getLocalTodayDateString()
      } else if (dateMode === 'year') {
        const y = parseInt(watchedYear) || new Date().getFullYear()
        finalWatchedAt = `${y}-01-01`
      } else {
        finalWatchedAt = getLocalTodayDateString()
      }

      const ratingVal = rating ?? 0

      // Se há um log carregado e o usuário está editando, ATUALIZA para não sobreescrever com novos IDs
      if (existingLogId) {
        return watchLogsApi.update(existingLogId, {
          watched_at: finalWatchedAt,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          episode_title: episodeTitle.trim() || undefined,
          platform: platform,
          is_rewatch: isRewatch,
          rating: ratingVal,
          review: review.trim(),
          contains_spoilers: containsSpoilers,
        })
      }

      // Caso contrário, cria um novo registro
      return watchLogsApi.create({
        media_id: mediaId,
        watched_at: finalWatchedAt,
        media_type: media.type,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        episode_title: episodeTitle.trim() || undefined,
        platform: platform,
        is_rewatch: isRewatch,
        rating: ratingVal,
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
      setErrorMsg(err.message || 'Erro ao salvar experiência')
    },
  })

  // Alterna para registrar uma nova sessão (Rewatch) em vez de editar a anterior
  const handleSwitchToNewSession = () => {
    setExistingLogId(null)
    setIsExistingLoaded(false)
    setSavedLogDate(null)
    setWatchedDate(getLocalTodayDateString())
    setIsRewatch(true)
  }

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
            {existingLogId ? <Pencil className="w-6 h-6" /> : <Film className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {existingLogId ? 'Editar Avaliação' : 'Já Vi Esse Filme!'}
            </h2>
            <p className="text-xs text-slate-400">
              {existingLogId
                ? 'Atualize a data, nota e impressões da sua avaliação salva.'
                : 'Registre sua sessão, avalie e guarde suas impressões no diário.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Banner Informativo: Avaliação Anterior Carregada */}
        {isLoadingExisting && (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-2.5 text-xs text-slate-400 animate-pulse">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            <span>Verificando se você já avaliou esta obra...</span>
          </div>
        )}

        {isExistingLoaded && existingLogId && !isLoadingExisting && (
          <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-cyan-200 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Avaliação anterior salva em{' '}
                <strong className="text-white font-mono">{formatDateDDMMYYYY(savedLogDate)}</strong> carregada.
              </span>
            </div>
            <button
              type="button"
              onClick={handleSwitchToNewSession}
              title="Registrar como nova sessão em vez de editar a anterior"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer self-end sm:self-auto shrink-0 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Registrar nova sessão</span>
            </button>
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
              onClick={() => {
                setMedia(undefined)
                setExistingLogId(null)
                setIsExistingLoaded(false)
                setSavedLogDate(null)
              }}
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
                placeholder="Digite o nome (ex: Pânico, Interestelar, Breaking Bad)..."
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

        {/* Escolha da Data */}
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

        {/* Avaliação por Estrelas (0 a 5 com passos de 0,5) */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
          <RatingStarsInput
            label="Sua Nota (Escala de 0 a 5 com passos de 0,5)"
            value={rating}
            onChange={(val) => setRating(val)}
            size="md"
            showQuickPills
          />
        </div>

        {/* Resenha / Avaliação com Editor Visual WYSIWYG */}
        <RichReviewEditor
          value={review}
          onChange={setReview}
          label="Resenha / O que achou?"
          placeholder="Conte o que achou da experiência, atuações, direção, reviravoltas..."
          minHeight="110px"
        />

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
          onClick={() => saveLogMutation.mutate()}
          disabled={!media || saveLogMutation.isPending || isLoadingExisting}
          className="w-full py-3.5 rounded-2xl font-bold text-sm bg-rose-500 text-white hover:bg-rose-400 active:scale-98 transition disabled:opacity-50 cursor-pointer shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2"
        >
          {saveLogMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{existingLogId ? 'Atualizando avaliação...' : 'Salvando sessão...'}</span>
            </>
          ) : (
            <>
              {existingLogId ? <Pencil className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{existingLogId ? 'Atualizar Avaliação' : 'Salvar no meu Diário'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
