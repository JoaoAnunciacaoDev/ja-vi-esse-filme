export type MediaType = 'movie' | 'tv'

export interface MediaItem {
  id: string
  tmdb_id?: number
  imdb_id?: string
  type: MediaType
  title: string
  original_title?: string
  overview?: string
  poster_url?: string
  backdrop_url?: string
  release_date?: string
  year?: number
  runtime?: number // em minutos
  genres?: string
  director?: string
  cast_members?: string
  total_seasons?: number
  total_episodes?: number
  created_at: string
  updated_at: string
}

export interface ExternalMediaResult {
  tmdb_id: number
  type: MediaType
  title: string
  original_title?: string
  overview?: string
  poster_url?: string
  backdrop_url?: string
  release_date?: string
  year?: number
  genres?: string
  vote_average?: number
}

export type WatchStatus = 'plan_to_watch' | 'watching' | 'completed' | 'paused' | 'dropped'

export interface UserMedia {
  id: string
  user_id: string
  media_id: string
  media?: MediaItem
  status: WatchStatus
  favorite: boolean
  in_collection: boolean
  current_season: number
  current_episode: number
  started_at?: string
  finished_at?: string
  created_at: string
  updated_at: string
}

export interface WatchLog {
  id: string
  user_id: string
  media_id: string
  media?: MediaItem
  user_media_id?: string
  watched_at: string // YYYY-MM-DD
  media_type: MediaType
  season_number: number
  episode_number: number
  episode_title?: string
  platform?: string // Cinema, Netflix, Prime Video, Max, Disney+, etc.
  is_rewatch: boolean
  rating: number // 0 a 5
  review?: string
  contains_spoilers: boolean
  created_at: string
  updated_at: string
}

export interface MediaReview {
  id: string
  user_id: string
  username: string
  avatar_url?: string
  rating: number
  review: string
  contains_spoilers: boolean
  watched_at: string
  is_rewatch: boolean
  platform?: string
  created_at: string
}

export interface EpisodeEvaluationView {
  episode_number: number
  episode_title?: string
  user_rating?: number | null // null se não avaliado; 0 é válido!
}

export interface SeasonEvaluationView {
  season_number: number
  user_rating?: number | null // Nota manual do usuário para a temporada
  calculated_rating?: number | null // Média calculada dos episódios
  episodes: EpisodeEvaluationView[]
}

export interface SeriesHierarchyView {
  media_id: string
  user_rating?: number | null // Nota manual do usuário para a série
  calculated_rating?: number | null // Média calculada das temporadas
  seasons: SeasonEvaluationView[]
}

export interface SetSeriesEvaluationInput {
  media_id: string
  season_number: number
  episode_number: number
  rating: number
}

