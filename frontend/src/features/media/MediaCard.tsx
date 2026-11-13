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
} from 'lucide-react'

interface MediaCardProps {
  media: MediaItem | ExternalMediaResult
  userStatus?: WatchStatus
  isUpdating?: boolean
  onUpdateStatus?: (media: MediaItem | ExternalMediaResult, status: WatchStatus) => void
  onLogWatch?: (media: MediaItem | ExternalMediaResult) => void
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
  isUpdating = false,
  onUpdateStatus,
  onLogWatch,
}: MediaCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isMovie = media.type === 'movie'

  const currentStatusConfig = userStatus ? STATUS_CONFIG[userStatus] : null

  return (
    <div className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 flex flex-col shadow-lg hover:shadow-rose-950/20">
      {/* Imagem do Pôster */}
      <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
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

        {/* Ano */}
        {media.year ? (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md bg-slate-950/70 border border-white/10 text-slate-300">
            {media.year}
          </div>
        ) : null}

        {/* Status Atual do Usuário se já estiver em sua lista */}
        {currentStatusConfig && (
          <div
            className={`absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${currentStatusConfig.bg}`}
          >
            <currentStatusConfig.icon className="w-3 h-3" />
            <span>{currentStatusConfig.label}</span>
          </div>
        )}

        {/* Nota média TMDB se não tiver badge sobreposta */}
        {!currentStatusConfig && 'vote_average' in media && media.vote_average && media.vote_average > 0 ? (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold backdrop-blur-md bg-slate-950/80 border border-amber-500/30 text-amber-400">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{media.vote_average.toFixed(1)}</span>
          </div>
        ) : null}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-rose-400 transition-colors" title={media.title}>
            {media.title}
          </h3>
          {media.original_title && media.original_title !== media.title && (
            <p className="text-xs text-slate-500 line-clamp-1 italic">{media.original_title}</p>
          )}
          {media.genres && (
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{media.genres}</p>
          )}
          {media.overview && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{media.overview}</p>
          )}
        </div>

        {/* Ações e Seletor de Status (Quero Ver, Assistindo, Já Vi, Pausado, Abandonado) */}
        <div className="pt-2 border-t border-slate-800/80 relative">
          <div className="flex items-center gap-1.5">
            {/* Botão Principal: Registrar Experiência com Detalhes */}
            {onLogWatch && (
              <button
                type="button"
                onClick={() => onLogWatch(media)}
                title="Registrar experiência no diário"
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 active:scale-95 transition cursor-pointer shadow-md shadow-rose-500/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Avaliar</span>
              </button>
            )}

            {/* Menu Dropdown de Status de Acompanhamento */}
            {onUpdateStatus && (
              <div className="relative">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMenuOpen(!isMenuOpen)
                  }}
                  title="Alterar status de acompanhamento"
                  className={`inline-flex items-center gap-1 py-2 px-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isUpdating
                      ? 'opacity-60 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-400'
                      : userStatus
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  ) : (
                    <span>{currentStatusConfig ? currentStatusConfig.label : 'Status'}</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsMenuOpen(false)
                      }}
                    />
                    <div className="absolute right-0 bottom-full mb-2 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 divide-y divide-slate-800/50">
                      <div className="pb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2 tracking-wider">
                          Mudar Status
                        </span>
                      </div>
                      <div className="pt-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateStatus(media, 'watching')
                            setIsMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                            userStatus === 'watching'
                              ? 'bg-cyan-500/10 text-cyan-400 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Assistindo</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateStatus(media, 'plan_to_watch')
                            setIsMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                            userStatus === 'plan_to_watch'
                              ? 'bg-amber-500/10 text-amber-400 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                          <span>Quero Ver</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateStatus(media, 'completed')
                            setIsMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                            userStatus === 'completed'
                              ? 'bg-rose-500/10 text-rose-400 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 text-rose-400" />
                          <span>Já Vi (Concluído)</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateStatus(media, 'paused')
                            setIsMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                            userStatus === 'paused'
                              ? 'bg-yellow-500/10 text-yellow-400 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Pause className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Pausado</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateStatus(media, 'dropped')
                            setIsMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                            userStatus === 'dropped'
                              ? 'bg-slate-800 text-slate-300 font-bold'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-rose-400'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Abandonado</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
