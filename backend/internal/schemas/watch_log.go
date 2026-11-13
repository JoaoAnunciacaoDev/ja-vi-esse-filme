package schemas

import "time"

type WatchLog struct {
	ID               string     `json:"id" gorm:"primaryKey"`
	UserID           string     `json:"user_id" gorm:"not null;index"`
	MediaID          string     `json:"media_id" gorm:"not null;index"`
	Media            *MediaItem `json:"media,omitempty" gorm:"foreignKey:MediaID"`
	UserMediaID      *string    `json:"user_media_id,omitempty"`
	WatchedAt        string     `json:"watched_at" gorm:"type:date;not null;index"` // YYYY-MM-DD
	MediaType        MediaType  `json:"media_type" gorm:"not null;default:'movie'"` // movie ou tv
	SeasonNumber     int        `json:"season_number" gorm:"default:0"`             // 0 para filme
	EpisodeNumber    int        `json:"episode_number" gorm:"default:0"`            // 0 para filme / temporada inteira
	EpisodeTitle     string     `json:"episode_title,omitempty"`
	Platform         string     `json:"platform,omitempty"` // Cinema, Netflix, Prime Video, Max, Disney+, etc.
	IsRewatch        bool       `json:"is_rewatch" gorm:"default:false"`
	Rating           float64    `json:"rating" gorm:"default:0"` // 0.5 a 5.0 estrelas
	Review           string     `json:"review,omitempty"`       // Comentários ou resenha
	ContainsSpoilers bool       `json:"contains_spoilers" gorm:"default:false"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (WatchLog) TableName() string {
	return "watch_logs"
}

type CreateWatchLogInput struct {
	MediaID          string    `json:"media_id" binding:"required"`
	WatchedAt        string    `json:"watched_at" binding:"required"` // YYYY-MM-DD
	MediaType        MediaType `json:"media_type" binding:"omitempty,oneof=movie tv"`
	SeasonNumber     int       `json:"season_number"`
	EpisodeNumber    int       `json:"episode_number"`
	EpisodeTitle     string    `json:"episode_title,omitempty"`
	Platform         string    `json:"platform,omitempty"`
	IsRewatch        bool      `json:"is_rewatch"`
	Rating           float64   `json:"rating" binding:"omitempty,gte=0,lte=5"`
	Review           string    `json:"review,omitempty"`
	ContainsSpoilers bool      `json:"contains_spoilers"`
}

type UpdateWatchLogInput struct {
	WatchedAt        *string    `json:"watched_at,omitempty"`
	SeasonNumber     *int       `json:"season_number,omitempty"`
	EpisodeNumber    *int       `json:"episode_number,omitempty"`
	EpisodeTitle     *string    `json:"episode_title,omitempty"`
	Platform         *string    `json:"platform,omitempty"`
	IsRewatch        *bool      `json:"is_rewatch,omitempty"`
	Rating           *float64   `json:"rating,omitempty" binding:"omitempty,gte=0,lte=5"`
	Review           *string    `json:"review,omitempty"`
	ContainsSpoilers *bool      `json:"contains_spoilers,omitempty"`
}
