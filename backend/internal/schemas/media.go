package schemas

import "time"

type MediaType string

const (
	MediaTypeMovie MediaType = "movie"
	MediaTypeTV    MediaType = "tv"
)

type MediaItem struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	TMDBID        *int      `json:"tmdb_id,omitempty" gorm:"uniqueIndex"`
	IMDBID        string    `json:"imdb_id,omitempty"`
	Type          MediaType `json:"type" gorm:"not null;default:'movie';index"`
	Title         string    `json:"title" gorm:"not null;index"`
	OriginalTitle string    `json:"original_title,omitempty"`
	Overview      string    `json:"overview,omitempty"`
	PosterURL     string    `json:"poster_url,omitempty"`
	BackdropURL   string    `json:"backdrop_url,omitempty"`
	ReleaseDate   string    `json:"release_date,omitempty"`
	Year          int       `json:"year,omitempty" gorm:"index"`
	Runtime       int       `json:"runtime,omitempty"` // em minutos
	Genres        string    `json:"genres,omitempty"`  // separados por vírgula ou JSON
	Director      string    `json:"director,omitempty"`
	CastMembers   string    `json:"cast_members,omitempty"`
	TotalSeasons  int       `json:"total_seasons,omitempty"`
	TotalEpisodes int       `json:"total_episodes,omitempty"`
	CreatedBy     *string   `json:"created_by,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (MediaItem) TableName() string {
	return "media_items"
}

type CreateMediaInput struct {
	TMDBID        *int      `json:"tmdb_id,omitempty"`
	IMDBID        string    `json:"imdb_id,omitempty"`
	Type          MediaType `json:"type" binding:"required,oneof=movie tv"`
	Title         string    `json:"title" binding:"required"`
	OriginalTitle string    `json:"original_title,omitempty"`
	Overview      string    `json:"overview,omitempty"`
	PosterURL     string    `json:"poster_url,omitempty"`
	BackdropURL   string    `json:"backdrop_url,omitempty"`
	ReleaseDate   string    `json:"release_date,omitempty"`
	Year          int       `json:"year,omitempty"`
	Runtime       int       `json:"runtime,omitempty"`
	Genres        string    `json:"genres,omitempty"`
	Director      string    `json:"director,omitempty"`
	CastMembers   string    `json:"cast_members,omitempty"`
	TotalSeasons  int       `json:"total_seasons,omitempty"`
	TotalEpisodes int       `json:"total_episodes,omitempty"`
}

type ExternalMediaResult struct {
	TMDBID        int       `json:"tmdb_id"`
	Type          MediaType `json:"type"`
	Title         string    `json:"title"`
	OriginalTitle string    `json:"original_title,omitempty"`
	Overview      string    `json:"overview,omitempty"`
	PosterURL     string    `json:"poster_url,omitempty"`
	BackdropURL   string    `json:"backdrop_url,omitempty"`
	ReleaseDate   string    `json:"release_date,omitempty"`
	Year          int       `json:"year,omitempty"`
	Genres        string    `json:"genres,omitempty"`
	VoteAverage   float64   `json:"vote_average,omitempty"`
}
