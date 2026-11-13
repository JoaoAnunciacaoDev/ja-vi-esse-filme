export interface AdminOverview {
  total_users: number
  new_users_last_30_days: number
  active_users_this_month: number
  total_media: number
  total_movies: number
  total_series: number
  total_watch_logs: number
  total_reviews: number
}

export interface AdminUserView {
  id: string
  email: string
  username: string
  display_name: string
  role: 'USER' | 'SUPERUSER'
  is_private: boolean
  total_logs: number
  total_media: number
  created_at: string
}

export interface AdminDashboardData {
  overview: AdminOverview
  top_cinephiles: Array<{
    id: string
    username: string
    display_name: string
    total_logs: number
  }>
}
