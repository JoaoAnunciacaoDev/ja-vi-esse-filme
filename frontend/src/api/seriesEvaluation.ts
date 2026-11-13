import { apiClient } from './client'
import type { SeriesHierarchyView, SetSeriesEvaluationInput } from '@/types/media'

export interface SeasonEpisodeItem {
  episode_number: number
  name: string
  overview?: string
  air_date?: string
}

export const seriesEvaluationApi = {
  getHierarchy: (mediaId: string): Promise<SeriesHierarchyView> =>
    apiClient.get<SeriesHierarchyView>(`/api/series-evaluations/${mediaId}`),

  setRating: (
    data: SetSeriesEvaluationInput
  ): Promise<{ message: string; hierarchy: SeriesHierarchyView }> =>
    apiClient.post<{ message: string; hierarchy: SeriesHierarchyView }>(
      '/api/series-evaluations',
      data
    ),

  deleteRating: (
    mediaId: string,
    season: number,
    episode: number
  ): Promise<{ message: string; hierarchy: SeriesHierarchyView }> =>
    apiClient.delete<{ message: string; hierarchy: SeriesHierarchyView }>(
      `/api/series-evaluations/${mediaId}?season=${season}&episode=${episode}`
    ),

  getSeasonEpisodes: (
    mediaId: string,
    seasonNumber: number
  ): Promise<{ season_number: number; episodes: SeasonEpisodeItem[] }> =>
    apiClient.get<{ season_number: number; episodes: SeasonEpisodeItem[] }>(
      `/api/series-evaluations/${mediaId}/season/${seasonNumber}`
    ),
}
