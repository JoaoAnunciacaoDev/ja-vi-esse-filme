import type { User } from './auth'
import type { MediaItem, UserMedia, WatchLog } from './media'

export type ActivityType =
  | 'WATCHED_MOVIE'
  | 'WATCHED_EPISODE'
  | 'WATCHED_SEASON'
  | 'ADDED_TO_WATCHLIST'
  | 'RATED_MEDIA'
  | 'REVIEW_POSTED'
  | 'PATCH_NOTE_PUBLISHED'

export interface ActivityLiker {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  liked_at?: string
}

export interface ActivityComment {
  id: string
  activity_id: string
  user_id: string
  content: string
  created_at: string
  user: User
}

export interface ActivityItem {
  id: string
  user_id: string
  type: ActivityType
  media_id?: string
  watch_log_id?: string
  metadata?: string
  created_at: string
  user: User
  media?: MediaItem
  watch_log?: WatchLog
  likes_count?: number
  has_liked?: boolean
  comments_count?: number
  liked_by?: ActivityLiker[]
}

export interface ActivityMetadata {
  media_title?: string
  poster_url?: string
  media_type?: string
  season_number?: number
  episode_number?: number
  platform?: string
  is_rewatch?: boolean
  rating?: number
  review?: string
  status?: string
  version?: string
  title?: string
  summary?: string
}

export type LeaderboardCriterion = 'watched' | 'movies' | 'episodes' | 'reviews'

export interface LeaderboardEntry {
  rank: number
  user: User
  score: number
  score_label: string
  is_current_user: boolean
  badge?: 'gold' | 'silver' | 'bronze'
}

export interface UserProfile {
  id: string
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  is_private: boolean
  is_self: boolean
  is_following: boolean
  is_pending: boolean
  is_followed_by: boolean
  followers_count: number
  following_count: number
  can_view_full: boolean
  created_at: string
  stats?: {
    total_movies_watched: number
    total_episodes_watched: number
    total_reviews: number
    avg_rating: number
  }
  library?: UserMedia[]
}

export interface UserPrivacySettings {
  id: string
  user_id: string
  profile_visibility: 'public' | 'followers' | 'private'
  library_visibility: 'public' | 'followers' | 'private'
  stats_visibility: 'public' | 'followers' | 'private'
  journal_visibility: 'public' | 'followers' | 'private'
  created_at: string
  updated_at: string
}

export interface UserSearchResult {
  id: string
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  is_private: boolean
  is_following: boolean
}
