import { apiClient } from './client'
import type { DashboardStats, HeatmapDay } from '@/types/stats'

export const statsApi = {
  getDashboard: (): Promise<DashboardStats> =>
    apiClient.get<DashboardStats>('/api/stats/dashboard'),

  getHeatmap: (): Promise<{ days: HeatmapDay[] }> =>
    apiClient.get<{ days: HeatmapDay[] }>('/api/stats/heatmap'),
}
