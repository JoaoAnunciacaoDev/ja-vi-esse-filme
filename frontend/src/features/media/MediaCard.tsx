import { useState } from 'react'
import type { MediaItem, ExternalMediaResult, WatchStatus } from '@/types/media'
import {
  Film,
  Tv,
  Star,
  Bookmark,
  Check,
  Plus,
  Play,
  Pause,
  XCircle,
  ChevronDown,
  Loader2,
  Heart,
} from 'lucide-react'

interface MediaCardProps {
  media: MediaItem | ExternalMediaResult
  userStatus?: WatchStatus
  isFavorite?: boolean
  isUpdating?: boolean
  onUpdateStatus?: (media: MediaItem | ExternalMediaResult, status: WatchStatus) => void
  onToggleFavorite?: (media: MediaItem | ExternalMediaResult) => void
  onLogWatch?: (media: MediaItem | ExternalMediaResult) => void
  onOpenDetails?: (media: MediaItem | ExternalMediaResult) => void
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

export function MediaCard({
  media,
  userStatus,
  isFavorite = false,
  isUpdating = false,
  onUpdateStatus,
  onToggleFavorite,
  onLogWatch,
  onOpenDetails,
}: MediaCardProps) {
  const [imageError, setImageError] = useState(false)
  const isMovie = media.type === 'movie'

  const currentStatusConfig = userStatus ? STATUS_CONFIG[userStatus] : null

  return (
    <div className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 flex flex-col shadow-lg hover:shadow-rose-950/20">
      {/* Imagem do Pôster (Clicável para abrir detalhes) */}
      <div
        onClick={() => onOpenDetails?.(media)}
        className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden cursor-pointer"
        title="Clique para ver detalhes da obra"
      >
        {media.poster_url && !imageError ? (
          <img
            src={media.poster_url}
            alt={media.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-600 bg-slate-950">
            {isMovie ? <Film className="w-12 h-12 mb-2 stroke-1" /> : <Tv className="w-12 h-12 mb-2 stroke-1" />}
            <span className="text-xs text-center font-medium text-slate-500 line-clamp-2">{media.title}</span>
          </div>
        )}

        {/* Badge de Tipo (Filme / Série) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase backdrop-blur-md bg-slate-950/70 border border-white/10 text-white">
          {isMovie ? <Film className="w-3 h-3 text-amber-400" /> : <Tv className="w-3 h-3 text-cyan-400" />}
          <span>{isMovie ? 'Filme' : 'Série'}</span>
        </div>

        {/* Botão de Favoritar Rápido no Pôster */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(media)
            }}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-label="Favoritar"
            className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-md ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-rose-500/40 hover:bg-rose-600 scale-105'
                : 'bg-slate-950/70 text-slate-300 hover:text-rose-400 hover:bg-slate-900 border border-white/10'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-white' : ''}`} />
          </button>
        )}

        {/* Status Atual do Usuário se já estiver em sua lista */}
        {currentStatusConfig && (
          <div
            className={`absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${currentStatusConfig.bg}`}
          >
            <currentStatusConfig.icon className="w-3 h-3" />
            <span>{currentStatusConfig.label}</span>
          </div>
        )}

        {/* Nota média TMDB se não tiver badge de status */}
        {!currentStatusConfig && 'vote_average' in media && media.vote_average && media.vote_average > 0 ? (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold backdrop-blur-md bg-slate-950/80 border border-amber-500/30 text-amber-400">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{media.vote_average.toFixed(1)}</span>
          </div>
        ) : null}

        {/* Ano no canto inferior direito do pôster */}
        {media.year ? (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md bg-slate-950/80 border border-white/10 text-slate-300">
            {media.year}
          </div>
        ) : null}
      </div>

      {/* Conteúdo */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div
          onClick={() => onOpenDetails?.(media)}
          className="cursor-pointer space-y-1"
          title="Clique para ver detalhes da obra"
        >
          <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-rose-400 transition-colors" title={media.title}>
            {media.title}
          </h3>
          {media.original_title && media.original_title !== media.title && (
            <p className="text-xs text-slate-500 line-clamp-1 italic">{media.original_title}</p>
          )}
          {media.genres && (
            <p className="text-[11px] text-slate-400 line-clamp-1">{media.genres}</p>
          )}
          {media.overview && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-0.5">{media.overview}</p>
          )}
        </div>

        {/* Ações e Seletor de Status Alinhados Verticalmente (um abaixo do outro) */}
        <div className="pt-2.5 border-t border-slate-800/80 flex flex-col gap-2">
          {/* Botão Principal: Registrar Experiência / Avaliar */}
          {onLogWatch && (
            <button
              type="button"
              onClick={() => onLogWatch(media)}
              title="Registrar experiência no diário"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 active:scale-95 transition cursor-pointer shadow-md shadow-rose-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span>Avaliar</span>
            </button>
          )}

          {/* Seletor Nativo Responsivo de Status (alinhado abaixo do botão) */}
          {onUpdateStatus && (
            <div className="relative w-full min-w-0">
              <select
                disabled={isUpdating}
                value={userStatus || ''}
                onChange={(e) => {
                  const newStatus = e.target.value as WatchStatus
                  if (newStatus) {
                    onUpdateStatus(media, newStatus)
                  }
                }}
                title="Alterar status de acompanhamento"
                aria-label="Status de acompanhamento"
                className={`w-full appearance-none py-2 pl-3 pr-8 rounded-xl text-xs font-semibold border transition cursor-pointer truncate ${
                  isUpdating
                    ? 'opacity-60 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-400'
                    : userStatus && currentStatusConfig
                    ? `${currentStatusConfig.bg} font-bold`
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  Status
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
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
                {isUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
