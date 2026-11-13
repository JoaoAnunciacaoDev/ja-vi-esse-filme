package schemas

import "time"

type WatchStatus string

const (
	StatusPlanToWatch WatchStatus = "plan_to_watch"
	StatusWatching    WatchStatus = "watching"
	StatusCompleted   WatchStatus = "completed"
	StatusPaused      WatchStatus = "paused"
	StatusDropped     WatchStatus = "dropped"
)

type UserMedia struct {
	ID             string      `json:"id" gorm:"primaryKey"`
	UserID         string      `json:"user_id" gorm:"not null;index"`
	MediaID        string      `json:"media_id" gorm:"not null;index"`
	Media          *MediaItem  `json:"media,omitempty" gorm:"foreignKey:MediaID"`
	Status         WatchStatus `json:"status" gorm:"not null;default:'plan_to_watch';index"`
	Favorite       bool        `json:"favorite" gorm:"default:false"`
	InCollection   bool        `json:"in_collection" gorm:"default:true"`
	CurrentSeason  int         `json:"current_season" gorm:"default:0"`
	CurrentEpisode int         `json:"current_episode" gorm:"default:0"`
	StartedAt      *time.Time  `json:"started_at,omitempty"`
	FinishedAt     *time.Time  `json:"finished_at,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

func (UserMedia) TableName() string {
	return "user_media"
}

type AddToUserMediaInput struct {
	MediaID        string      `json:"media_id" binding:"required"`
	Status         WatchStatus `json:"status" binding:"omitempty,oneof=plan_to_watch watching completed paused dropped"`
	Favorite       *bool       `json:"favorite,omitempty"`
	InCollection   *bool       `json:"in_collection,omitempty"`
	CurrentSeason  *int        `json:"current_season,omitempty"`
	CurrentEpisode *int        `json:"current_episode,omitempty"`
}

type UpdateUserMediaInput struct {
	Status         *WatchStatus `json:"status,omitempty" binding:"omitempty,oneof=plan_to_watch watching completed paused dropped"`
	Favorite       *bool        `json:"favorite,omitempty"`
	InCollection   *bool        `json:"in_collection,omitempty"`
	CurrentSeason  *int         `json:"current_season,omitempty"`
	CurrentEpisode *int         `json:"current_episode,omitempty"`
}
