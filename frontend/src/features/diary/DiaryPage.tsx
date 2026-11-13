import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { watchLogsApi } from '@/api/watchLogs'
import type { WatchLog, MediaItem } from '@/types/media'
import { Film, Tv, Star, Calendar, Plus, Trash2, Repeat, Loader2, Sparkles, AlertTriangle } from 'lucide-react'

interface DiaryPageProps {
  onOpenLogModal: (media?: MediaItem) => void
  onNavigateToCatalog: () => void
}

export function DiaryPage({ onOpenLogModal, onNavigateToCatalog }: DiaryPageProps) {
  const queryClient = useQueryClient()
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['watch-logs'],
    queryFn: () => watchLogsApi.list({ limit: 50 }),
  })

  const { data: summary } = useQuery({
    queryKey: ['watch-logs-summary'],
    queryFn: () => watchLogsApi.getSummary(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchLogsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-logs'] })
      queryClient.invalidateQueries({ queryKey: ['watch-logs-summary'] })
      queryClient.invalidateQueries({ queryKey: ['stats-dashboard'] })
    },
  })

  const toggleExpand = (id: string) => {
    setExpandedReviews((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const logs = data?.items || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Film className="w-6 h-6 text-emerald-400" />
            <span>Diário de Filmes & Séries</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Seu histórico de tudo o que já assistiu, com avaliações, rewatches e notas ao longo do tempo.
          </p>
        </div>

        <button
          onClick={() => onOpenLogModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition cursor-pointer shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar que Vi</span>
        </button>
      </div>

      {/* Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Filmes Vistos</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white">{summary.total_movies}</span>
              <Film className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Episódios de Série</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white">{summary.total_episodes}</span>
              <Tv className="w-4 h-4 text-cyan-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Média de Notas</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white">
                {summary.avg_rating > 0 ? summary.avg_rating.toFixed(1) : '-'}
              </span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reassistidos</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white">{summary.total_rewatches}</span>
              <Repeat className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Lista do Diário (Linha do Tempo) */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map((log: WatchLog) => {
            const media = log.media
            const isMovie = log.media_type === 'movie'
            const isLongReview = log.review && log.review.length > 100
            const isExpanded = expandedReviews[log.id]

            return (
              <div
                key={log.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 flex flex-col sm:flex-row gap-4 shadow-lg group"
              >
                {/* Pôster miniatura */}
                <div className="relative w-16 h-24 sm:w-20 sm:h-28 bg-slate-950 rounded-xl overflow-hidden shrink-0">
                  {media?.poster_url ? (
                    <img
                      src={media.poster_url}
                      alt={media.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950">
                      {isMovie ? <Film className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
                    </div>
                  )}
                </div>

                {/* Detalhes da Sessão */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                  <div>
                    {/* Linha 1: Título e Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-white text-base truncate">
                        {media?.title || 'Título desconhecido'}
                      </h3>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {isMovie ? 'Filme' : 'Série'}
                      </span>

                      {!isMovie && (log.season_number > 0 || log.episode_number > 0) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                          T{log.season_number} E{log.episode_number}
                          {log.episode_title ? ` - ${log.episode_title}` : ''}
                        </span>
                      )}

                      {log.is_rewatch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 border border-purple-500/30 text-purple-300">
                          <Repeat className="w-3 h-3" />
                          <span>Rewatch</span>
                        </span>
                      )}

                      {log.platform && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800/80 text-slate-400">
                          {log.platform}
                        </span>
                      )}
                    </div>

                    {/* Linha 2: Data e Avaliação */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{log.watched_at}</span>
                      </div>

                      {log.rating > 0 && (
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{log.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Resenha / Comentário */}
                    {log.review && (
                      <div className="mt-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
                        {log.contains_spoilers && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 mb-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Contém Spoilers</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                          {isLongReview && !isExpanded
                            ? `${log.review.slice(0, 100)}...`
                            : log.review}
                        </p>
                        {isLongReview && (
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer pt-0.5"
                          >
                            {isExpanded ? 'Ler menos' : 'Ler mais'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => {
                        if (confirm('Excluir este registro de visualização?')) {
                          deleteMutation.mutate(log.id)
                        }
                      }}
                      title="Excluir do diário"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-10 text-center space-y-4">
          <Film className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Seu diário está vazio</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Registre os filmes e séries que você assistiu para começar a acumular suas avaliações!
            </p>
          </div>
          <button
            onClick={() => onNavigateToCatalog()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explorar filmes e séries</span>
          </button>
        </div>
      )}
    </div>
  )
}
