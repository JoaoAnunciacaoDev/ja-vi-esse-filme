import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seriesEvaluationApi, type SeasonEpisodeItem } from '@/api/seriesEvaluation'
import { RatingStarsInput } from '@/components/ui/RatingStarsInput'
import type { MediaItem, ExternalMediaResult } from '@/types/media'
import {
  X,
  Tv,
  Star,
  Calculator,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react'

interface SeriesEvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  media?: MediaItem | ExternalMediaResult
}

export function SeriesEvaluationModal({
  isOpen,
  onClose,
  media,
}: SeriesEvaluationModalProps) {
  const queryClient = useQueryClient()
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const mediaId = media && 'id' in media && media.id ? String(media.id) : ''

  // 1. Carrega hierarquia completa de notas salvas
  const { data: hierarchy, isLoading: isHierarchyLoading } = useQuery({
    queryKey: ['series-hierarchy', mediaId],
    queryFn: () => seriesEvaluationApi.getHierarchy(mediaId),
    enabled: isOpen && Boolean(mediaId),
  })

  // 2. Carrega lista de episódios da temporada ativa
  const { data: seasonData, isLoading: isSeasonEpisodesLoading } = useQuery({
    queryKey: ['season-episodes', mediaId, selectedSeasonNumber],
    queryFn: () => seriesEvaluationApi.getSeasonEpisodes(mediaId, selectedSeasonNumber),
    enabled: isOpen && Boolean(mediaId),
  })

  // Mutação para salvar/atualizar nota (série, temporada ou episódio)
  const setRatingMutation = useMutation({
    mutationFn: ({
      season,
      episode,
      rating,
    }: {
      season: number
      episode: number
      rating: number
    }) =>
      seriesEvaluationApi.setRating({
        media_id: mediaId,
        season_number: season,
        episode_number: episode,
        rating,
      }),
    onSuccess: (res, vars) => {
      queryClient.setQueryData(['series-hierarchy', mediaId], res.hierarchy)
      queryClient.invalidateQueries({ queryKey: ['watch-logs'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })

      let target = 'Série'
      if (vars.season > 0 && vars.episode === 0) {
        target = `Temporada ${vars.season}`
      } else if (vars.season > 0 && vars.episode > 0) {
        target = `T${vars.season} E${vars.episode}`
      }
      showToast(`Avaliação de ${target} atualizada para ${vars.rating.toFixed(1)} ★!`)
    },
    onError: (err: any) => {
      showToast(err?.message || 'Erro ao salvar avaliação')
    },
  })

  // Mutação para remover nota
  const deleteRatingMutation = useMutation({
    mutationFn: ({ season, episode }: { season: number; episode: number }) =>
      seriesEvaluationApi.deleteRating(mediaId, season, episode),
    onSuccess: (res, vars) => {
      queryClient.setQueryData(['series-hierarchy', mediaId], res.hierarchy)
      queryClient.invalidateQueries({ queryKey: ['watch-logs'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })

      let target = 'Série'
      if (vars.season > 0 && vars.episode === 0) {
        target = `Temporada ${vars.season}`
      } else if (vars.season > 0 && vars.episode > 0) {
        target = `T${vars.season} E${vars.episode}`
      }
      showToast(`Avaliação de ${target} removida com sucesso.`)
    },
    onError: (err: any) => {
      showToast(err?.message || 'Erro ao remover avaliação')
    },
  })

  if (!isOpen || !media) return null

  // Mapeia avaliações dos episódios da temporada ativa
  const currentSeasonView = hierarchy?.seasons?.find(
    (s) => s.season_number === selectedSeasonNumber
  )

  const episodeRatingMap = new Map<number, number>()
  for (const ep of currentSeasonView?.episodes || []) {
    if (ep.user_rating !== null && ep.user_rating !== undefined) {
      episodeRatingMap.set(ep.episode_number, ep.user_rating)
    }
  }

  // Lista de episódios da temporada atual
  const episodesList: SeasonEpisodeItem[] = seasonData?.episodes || []

  // Total de temporadas calculadas
  const totalSeasonsCount = Math.max(
    media && 'total_seasons' in media && media.total_seasons ? media.total_seasons : 1,
    hierarchy?.seasons?.length || 1
  )

  const seasonsList = Array.from({ length: totalSeasonsCount }, (_, i) => i + 1)

  const isSaving = setRatingMutation.isPending || deleteRatingMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 my-auto flex flex-col max-h-[92vh]">
        {/* Cabeçalho do Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 shrink-0">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Avaliação Hierárquica
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                {media.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Avalie episódios, temporadas e a série inteira com notas manuais e médias calculadas automaticamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* NÍVEL 1: AVALIAÇÃO DA SÉRIE COMO UM TODO */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Avaliação da Série (Geral)
                </h3>
                {isHierarchyLoading && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Nível 1 de 3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nota Manual do Usuário */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Sua Nota Manual (Série)
                </span>
                <RatingStarsInput
                  value={hierarchy?.user_rating}
                  disabled={isSaving}
                  size="md"
                  showQuickPills
                  onChange={(newRating) => {
                    if (newRating !== null) {
                      setRatingMutation.mutate({ season: 0, episode: 0, rating: newRating })
                    } else {
                      deleteRatingMutation.mutate({ season: 0, episode: 0 })
                    }
                  }}
                />
              </div>

              {/* Média Calculada das Temporadas */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Calculator className="w-4 h-4 text-cyan-400" />
                    <span>Média Calculada (Temporadas)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gerada a partir das médias das temporadas avaliadas.
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/60 flex items-center gap-2">
                  {hierarchy?.calculated_rating !== null && hierarchy?.calculated_rating !== undefined ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-sm">
                      <Star className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                      <span>{hierarchy.calculated_rating.toFixed(1)} / 5.0</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 italic">
                      — Sem avaliações de temporadas suficientes
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* NÍVEL 2: AVALIAÇÃO DA TEMPORADA */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Temporadas & Episódios
                </h3>
              </div>

              {/* Seletor de Temporadas */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {seasonsList.map((sNum) => {
                  const sView = hierarchy?.seasons?.find((s) => s.season_number === sNum)
                  const hasRating =
                    sView?.user_rating !== null && sView?.user_rating !== undefined
                  const hasCalc =
                    sView?.calculated_rating !== null && sView?.calculated_rating !== undefined

                  return (
                    <button
                      key={sNum}
                      type="button"
                      onClick={() => setSelectedSeasonNumber(sNum)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        selectedSeasonNumber === sNum
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      <span>Temporada {sNum}</span>
                      {(hasRating || hasCalc) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Banner da Temporada Ativa com Nota Manual e Média Calculada */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4.5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Temporada {selectedSeasonNumber}</span>
                </h4>
                <span className="text-xs text-slate-400">
                  {episodesList.length > 0 ? `${episodesList.length} episódios` : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nota manual da Temporada */}
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Sua Nota Manual (Temporada {selectedSeasonNumber})
                  </span>
                  <RatingStarsInput
                    value={currentSeasonView?.user_rating}
                    disabled={isSaving}
                    size="md"
                    showQuickPills
                    onChange={(newRating) => {
                      if (newRating !== null) {
                        setRatingMutation.mutate({
                          season: selectedSeasonNumber,
                          episode: 0,
                          rating: newRating,
                        })
                      } else {
                        deleteRatingMutation.mutate({
                          season: selectedSeasonNumber,
                          episode: 0,
                        })
                      }
                    }}
                  />
                </div>

                {/* Média calculada dos episódios da temporada */}
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <span>Média Calculada dos Episódios</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Média aritmética apenas dos episódios com avaliação.
                    </p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-800/60 flex items-center gap-2">
                    {currentSeasonView?.calculated_rating !== null &&
                    currentSeasonView?.calculated_rating !== undefined ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-sm">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{currentSeasonView.calculated_rating.toFixed(1)} / 5.0</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 italic">
                        — Sem episódios avaliados
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* NÍVEL 3: AVALIAÇÃO INDIVIDUAL DE CADA EPISÓDIO */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Episódios da Temporada {selectedSeasonNumber}
                </h4>
                <span className="text-[11px] text-slate-500">
                  Escala de 0 a 5 com incrementos de 0,5
                </span>
              </div>

              {isSeasonEpisodesLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                  <span className="text-xs font-medium">Carregando episódios...</span>
                </div>
              ) : episodesList.length > 0 ? (
                <div className="divide-y divide-slate-800/80 bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
                  {episodesList.map((ep) => {
                    const epRating = episodeRatingMap.has(ep.episode_number)
                      ? episodeRatingMap.get(ep.episode_number)
                      : null

                    return (
                      <div
                        key={ep.episode_number}
                        className="p-3.5 sm:p-4 hover:bg-slate-900/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Info do Episódio */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 shrink-0">
                              E{ep.episode_number}
                            </span>
                            <h5 className="text-sm font-bold text-white truncate">
                              {ep.name || `Episódio ${ep.episode_number}`}
                            </h5>
                          </div>
                          {ep.overview && (
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {ep.overview}
                            </p>
                          )}
                        </div>

                        {/* Seletor de Nota do Episódio */}
                        <div className="shrink-0 flex items-center justify-end">
                          <RatingStarsInput
                            value={epRating}
                            disabled={isSaving}
                            size="sm"
                            onChange={(newRating) => {
                              if (newRating !== null) {
                                setRatingMutation.mutate({
                                  season: selectedSeasonNumber,
                                  episode: ep.episode_number,
                                  rating: newRating,
                                })
                              } else {
                                deleteRatingMutation.mutate({
                                  season: selectedSeasonNumber,
                                  episode: ep.episode_number,
                                })
                              }
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-400">
                    Nenhum episódio cadastrado nesta temporada.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                <span>Atualizando médias...</span>
              </>
            ) : (
              <span>Todas as médias são recalculadas automaticamente.</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}
