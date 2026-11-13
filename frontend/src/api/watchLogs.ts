import { apiClient } from './client'
import type { WatchLog, MediaType } from '@/types/media'

export interface ListWatchLogsParams {
  page?: number
  limit?: number
  media_id?: string
  media_type?: MediaType
}

export interface ListWatchLogsResponse {
  items: WatchLog[]
  page: number
  limit: number
  total: number
}

export interface WatchLogSummary {
  total_logs: number
  total_movies: number
  total_episodes: number
  total_rewatches: number
  avg_rating: number
}

export interface CreateWatchLogInput {
  media_id: string
  watched_at?: string // YYYY-MM-DD, YYYY ou vazio se não lembra
  media_type?: MediaType
  season_number?: number
  episode_number?: number
  episode_title?: string
  platform?: string
  is_rewatch?: boolean
  rating?: number
  review?: string
  contains_spoilers?: boolean
}

export interface UpdateWatchLogInput {
  watched_at?: string
  season_number?: number
  episode_number?: number
  episode_title?: string
  platform?: string
  is_rewatch?: boolean
  rating?: number
  review?: string
  contains_spoilers?: boolean
}

export const watchLogsApi = {
  list: (params?: ListWatchLogsParams): Promise<ListWatchLogsResponse> => {
    const sp = new URLSearchParams()
    if (params?.page) sp.append('page', params.page.toString())
    if (params?.limit) sp.append('limit', params.limit.toString())
    if (params?.media_id) sp.append('media_id', params.media_id)
    if (params?.media_type) sp.append('media_type', params.media_type)
    const qs = sp.toString()
    return apiClient.get<ListWatchLogsResponse>(`/api/watch-logs${qs ? `?${qs}` : ''}`)
  },

  create: (data: CreateWatchLogInput): Promise<{ message: string; log: WatchLog }> =>
    apiClient.post<{ message: string; log: WatchLog }>('/api/watch-logs', data),

  getSummary: (): Promise<WatchLogSummary> =>
    apiClient.get<WatchLogSummary>('/api/watch-logs/summary'),

  update: (id: string, data: UpdateWatchLogInput): Promise<{ message: string; log: WatchLog }> =>
    apiClient.put<{ message: string; log: WatchLog }>(`/api/watch-logs/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/api/watch-logs/${id}`),
}
