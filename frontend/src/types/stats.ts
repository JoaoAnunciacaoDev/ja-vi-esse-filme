export interface DashboardStats {
  overview: {
    total_logs: number
    total_movies: number
    total_episodes: number
    total_rewatches: number
    avg_rating: number
    watched_this_year: number
    watched_this_month: number
    plan_to_watch: number
    watching: number
    completed: number
    favorites: number
  }
  platforms: Array<{
    platform: string
    count: number
  }>
  monthly: Array<{
    month: string
    count: number
  }>
}

export interface HeatmapDay {
  date: string
  count: number
}
