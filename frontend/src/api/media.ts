import { apiClient } from './client'
import type { MediaItem, ExternalMediaResult, MediaReview } from '@/types/media'

export interface ListMediaParams {
  q?: string
  type?: string
  page?: number
  limit?: number
}

export interface ListMediaResponse {
  items: MediaItem[]
  page: number
  limit: number
  total: number
}

export interface ShowMediaResponse {
  media: MediaItem
  avg_rating: number
  total_reviews: number
}

export const mediaApi = {
  list: (params?: ListMediaParams): Promise<ListMediaResponse> => {
    const sp = new URLSearchParams()
    if (params?.q) sp.append('q', params.q)
    if (params?.type) sp.append('type', params.type)
    if (params?.page) sp.append('page', params.page.toString())
    if (params?.limit) sp.append('limit', params.limit.toString())
    const qs = sp.toString()
    return apiClient.get<ListMediaResponse>(`/api/media${qs ? `?${qs}` : ''}`)
  },

  getById: (id: string): Promise<ShowMediaResponse> =>
    apiClient.get<ShowMediaResponse>(`/api/media/${id}`),

  searchExternal: (query: string, type?: string): Promise<{ results: ExternalMediaResult[]; source: string }> => {
    const sp = new URLSearchParams()
    if (query) sp.append('q', query)
    if (type) sp.append('type', type)
    const qs = sp.toString()
    return apiClient.get<{ results: ExternalMediaResult[]; source: string }>(`/api/media/search-external${qs ? `?${qs}` : ''}`)
  },

  create: (data: Partial<MediaItem>): Promise<{ message: string; media: MediaItem }> =>
    apiClient.post<{ message: string; media: MediaItem }>('/api/media', data),

  import: (data: Partial<MediaItem>): Promise<{ message: string; media: MediaItem }> =>
    apiClient.post<{ message: string; media: MediaItem }>('/api/media/import', data),

  getReviews: (mediaId: string): Promise<{ reviews: MediaReview[] }> =>
    apiClient.get<{ reviews: MediaReview[] }>(`/api/media/${mediaId}/reviews`),
}
