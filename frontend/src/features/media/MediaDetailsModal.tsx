import { useState } from 'react'
import type { MediaItem, ExternalMediaResult, WatchStatus } from '@/types/media'
import { formatDateDDMMYYYY } from '@/utils/date'
import {
  X,
  Film,
  Tv,
  Star,
  Clock,
  Calendar,
  Layers,
  Heart,
  Plus,
  Bookmark,
  Play,
  Check,
  Pause,
  XCircle,
  Loader2,
  ChevronDown,
  Calculator,
} from 'lucide-react'

interface MediaDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  media?: MediaItem | ExternalMediaResult
  userStatus?: WatchStatus
  isFavorite?: boolean
  isUpdating?: boolean
  onUpdateStatus?: (media: MediaItem | ExternalMediaResult, status: WatchStatus | null) => void
  onToggleFavorite?: (media: MediaItem | ExternalMediaResult) => void
  onLogWatch?: (media: MediaItem | ExternalMediaResult) => void
  onOpenSeriesEvaluation?: (media: MediaItem | ExternalMediaResult) => void
}

const STATUS_CONFIG: Record<
  WatchStatus,
  { label: string; icon: typeof Film; color: string; bg: string }
> = {
  plan_to_watch: {
    label: 'Quero Ver',
    icon: Bookmark,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  },
  watching: {
    label: 'Assistindo',
    icon: Play,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
  },
  completed: {
    label: 'Já Vi',
    icon: Check,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  },
  paused: {
    label: 'Pausado',
    icon: Pause,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  },
  dropped: {
    label: 'Abandonado',
    icon: XCircle,
    color: 'text-slate-400',
    bg: 'bg-slate-800 border-slate-700 text-slate-400',
  },
}

function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function MediaDetailsModal({
  isOpen,
  onClose,
  media,
  userStatus,
  isFavorite = false,
  isUpdating = false,
  onUpdateStatus,
  onToggleFavorite,
  onLogWatch,
  onOpenSeriesEvaluation,
}: MediaDetailsModalProps) {
  const [imageError, setImageError] = useState(false)
  const [backdropError, setBackdropError] = useState(false)

  if (!isOpen || !media) return null

  const isMovie = media.type === 'movie'
  const currentStatusConfig = userStatus ? STATUS_CONFIG[userStatus] : null
  const formattedRuntime = 'runtime' in media ? formatRuntime(media.runtime) : null

  const genresList = media.genres
    ? media.genres.split(',').map((g) => g.trim()).filter(Boolean)
    : []

  const voteAverage = 'vote_average' in media && media.vote_average ? media.vote_average : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 my-auto flex flex-col max-h-[90vh]">
        {/* Banner Backdrop */}
        <div className="relative h-44 sm:h-56 w-full bg-slate-950 shrink-0 overflow-hidden">
          {media.backdrop_url && !backdropError ? (
            <img
              src={media.backdrop_url}
              alt={media.title}
              className="w-full h-full object-cover opacity-60"
              onError={() => setBackdropError(true)}
            />
          ) : media.poster_url && !imageError ? (
            <img
              src={media.poster_url}
              alt={media.title}
              className="w-full h-full object-cover opacity-30 blur-sm scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950" />
          )}

          {/* Gradiente para fusão com o corpo do modal */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/70 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Botão de Favoritar Rápido no Topo */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(media)}
              title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`absolute top-4 right-16 z-20 p-2 rounded-full backdrop-blur-md transition cursor-pointer flex items-center gap-1.5 shadow-lg ${
                isFavorite
                  ? 'bg-rose-500 text-white font-bold shadow-rose-500/30 hover:bg-rose-600'
                  : 'bg-slate-950/70 border border-white/10 text-slate-300 hover:text-rose-400 hover:bg-slate-900'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="text-xs font-semibold pr-1 hidden sm:inline">
                {isFavorite ? 'Favorito' : 'Favoritar'}
              </span>
            </button>
          )}

          {/* Badge de Tipo no Topo Esquerdo */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-md bg-slate-950/80 border border-white/10 text-white shadow-md">
            {isMovie ? (
              <Film className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{isMovie ? 'Filme' : 'Série'}</span>
          </div>
        </div>

        {/* Informações Principais (Sobreposição do Poster) */}
        <div className="px-5 sm:px-6 pb-6 pt-0 overflow-y-auto space-y-5 -mt-16 sm:-mt-20 relative z-10">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-end">
            {/* Poster miniatura */}
            <div className="w-28 sm:w-36 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 shadow-2xl relative">
              {media.poster_url && !imageError ? (
                <img
                  src={media.poster_url}
                  alt={media.title}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-600 bg-slate-950">
                  {isMovie ? <Film className="w-10 h-10 mb-2 stroke-1" /> : <Tv className="w-10 h-10 mb-2 stroke-1" />}
                  <span className="text-[10px] text-center font-medium text-slate-500 line-clamp-2">
                    {media.title}
                  </span>
                </div>
              )}
            </div>

            {/* Cabeçalho do Título */}
            <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {media.title}
              </h2>
              {media.original_title && media.original_title !== media.title && (
                <p className="text-xs sm:text-sm text-slate-400 italic">
                  Título original: {media.original_title}
                </p>
              )}

              {/* Metadados: Ano, Duração, Nota, Temporadas */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {media.year ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{media.year}</span>
                  </span>
                ) : null}

                {formattedRuntime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formattedRuntime}</span>
                  </span>
                )}

                {!isMovie && 'total_seasons' in media && media.total_seasons && media.total_seasons > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    <span>{media.total_seasons} {media.total_seasons === 1 ? 'temporada' : 'temporadas'}</span>
                  </span>
                ) : null}

                {voteAverage && voteAverage > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{voteAverage.toFixed(1)} TMDB</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Gêneros */}
          {genresList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {genresList.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-800/80 border border-slate-700/60 text-slate-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Banner de Avaliação Hierárquica para Séries */}
          {!isMovie && onOpenSeriesEvaluation && (
            <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  Sistema de Avaliações de Série
                </span>
                <p className="text-[11px] text-slate-400">
                  Atribua notas por episódio e temporada com cálculo automático da média geral.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenSeriesEvaluation(media)
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition cursor-pointer shrink-0 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Avaliar Episódios & Temporadas</span>
              </button>
            </div>
          )}

          {/* Sinopse / Visão Geral */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sinopse
            </h3>
            {media.overview ? (
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
                {media.overview}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
                Nenhuma sinopse disponível para este título.
              </p>
            )}
          </div>

          {/* Informações Adicionais (Diretor, Elenco, etc.) */}
          {'director' in media && media.director && (
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Direção:</span> {media.director}
            </div>
          )}
          {'cast_members' in media && media.cast_members && (
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Elenco:</span> {media.cast_members}
            </div>
          )}
          {'release_date' in media && media.release_date && (
            <div className="text-xs text-slate-500">
              Lançamento oficial: {formatDateDDMMYYYY(media.release_date)}
            </div>
          )}
        </div>

        {/* Rodapé de Ações do Modal */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Seletor de Status */}
          {onUpdateStatus && (
            <div className="relative w-full sm:w-56">
              <select
                disabled={isUpdating}
                value={userStatus || ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'none') {
                    onUpdateStatus(media, null)
                  } else if (val) {
                    onUpdateStatus(media, val as WatchStatus)
                  }
                }}
                className={`w-full appearance-none py-2.5 pl-3 pr-8 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isUpdating
                    ? 'opacity-60 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-400'
                    : userStatus && currentStatusConfig
                    ? `${currentStatusConfig.bg} font-bold`
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white'
                }`}
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  {userStatus ? 'Alterar status' : 'Definir status na videoteca'}
                </option>
                <option value="watching" className="bg-slate-900 text-cyan-400">
                  Assistindo
                </option>
                <option value="plan_to_watch" className="bg-slate-900 text-amber-400">
                  Quero Ver
                </option>
                <option value="completed" className="bg-slate-900 text-rose-400">
                  Já Vi
                </option>
                <option value="paused" className="bg-slate-900 text-yellow-400">
                  Pausado
                </option>
                <option value="dropped" className="bg-slate-900 text-slate-400">
                  Abandonado
                </option>
                {userStatus && (
                  <option value="none" className="bg-slate-900 text-rose-400 font-bold">
                    ✕ Remover status (Desmarcar)
                  </option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 opacity-70" />
                )}
              </div>
            </div>
          )}

          {/* Botões: Avaliar / Fechar */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onLogWatch && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onLogWatch(media)
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition cursor-pointer shadow-lg shadow-rose-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Avaliar / Registrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
