import { useState } from 'react'
import type { MediaItem, ExternalMediaResult } from '@/types/media'
import { Film, Tv, Star, Bookmark, Check, Plus } from 'lucide-react'

interface MediaCardProps {
  media: MediaItem | ExternalMediaResult
  onAddToWatchlist?: (media: MediaItem | ExternalMediaResult) => void
  onLogWatch?: (media: MediaItem | ExternalMediaResult) => void
  isInWatchlist?: boolean
}

export function MediaCard({ media, onAddToWatchlist, onLogWatch, isInWatchlist }: MediaCardProps) {
  const [imageError, setImageError] = useState(false)
  const isMovie = media.type === 'movie'

  return (
    <div className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 flex flex-col shadow-lg hover:shadow-emerald-950/20">
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

        {/* Nota média externa se houver */}
        {'vote_average' in media && media.vote_average && media.vote_average > 0 ? (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold backdrop-blur-md bg-slate-950/80 border border-amber-500/30 text-amber-400">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{media.vote_average.toFixed(1)}</span>
          </div>
        ) : null}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-emerald-400 transition-colors" title={media.title}>
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

        {/* Ações */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
          {onLogWatch && (
            <button
              onClick={() => onLogWatch(media)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-400 active:scale-95 transition cursor-pointer shadow-md shadow-rose-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Já Vi</span>
            </button>
          )}

          {onAddToWatchlist && (
            <button
              onClick={() => onAddToWatchlist(media)}
              title={isInWatchlist ? 'Já na sua lista' : 'Assistir mais tarde'}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isInWatchlist
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isInWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
