import { apiClient } from './client'
import type { UserMedia, WatchStatus } from '@/types/media'

export interface ListWatchlistParams {
  status?: WatchStatus
  favorite?: boolean
  platform?: string
}

export interface AddToWatchlistInput {
  media_id: string
  status?: WatchStatus
  favorite?: boolean
  in_collection?: boolean
  platform?: string
  current_season?: number
  current_episode?: number
}

export interface UpdateWatchlistInput {
  status?: WatchStatus
  favorite?: boolean
  in_collection?: boolean
  platform?: string
  current_season?: number
  current_episode?: number
}

export const watchlistApi = {
  list: (params?: ListWatchlistParams): Promise<{ items: UserMedia[] }> => {
    const sp = new URLSearchParams()
    if (params?.status) sp.append('status', params.status)
    if (params?.favorite !== undefined) sp.append('favorite', String(params.favorite))
    if (params?.platform) sp.append('platform', params.platform)
    const qs = sp.toString()
    return apiClient.get<{ items: UserMedia[] }>(`/api/watchlist${qs ? `?${qs}` : ''}`)
  },

  add: (data: AddToWatchlistInput): Promise<{ message: string; item: UserMedia }> =>
    apiClient.post<{ message: string; item: UserMedia }>('/api/watchlist', data),

  update: (id: string, data: UpdateWatchlistInput): Promise<{ message: string; item: UserMedia }> =>
    apiClient.put<{ message: string; item: UserMedia }>(`/api/watchlist/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/api/watchlist/${id}`),

  toggleFavorite: (id: string): Promise<{ favorite: boolean; message: string }> =>
    apiClient.patch<{ favorite: boolean; message: string }>(`/api/watchlist/${id}/favorite`, {}),

  toggleCollection: (id: string): Promise<{ in_collection: boolean; message: string }> =>
    apiClient.patch<{ in_collection: boolean; message: string }>(`/api/watchlist/${id}/collection`, {}),
}
