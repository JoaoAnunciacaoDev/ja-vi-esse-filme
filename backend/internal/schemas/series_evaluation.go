package schemas

import "time"

type SeriesEvaluation struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	UserID        string    `json:"user_id" gorm:"not null;index"`
	MediaID       string    `json:"media_id" gorm:"not null;index"`
	SeasonNumber  int       `json:"season_number" gorm:"default:0;index"`  // 0 = série inteira
	EpisodeNumber int       `json:"episode_number" gorm:"default:0;index"` // 0 = temporada inteira
	Rating        float64   `json:"rating" gorm:"not null"`                // 0.0 a 5.0 (passos de 0.5)
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (SeriesEvaluation) TableName() string {
	return "series_evaluations"
}

type SetSeriesEvaluationInput struct {
	MediaID       string  `json:"media_id" binding:"required"`
	SeasonNumber  int     `json:"season_number"`  // 0 = série como um todo
	EpisodeNumber int     `json:"episode_number"` // 0 = temporada como um todo
	Rating        float64 `json:"rating"`         // deve ser entre 0 e 5, múltiplo de 0.5
}

type EpisodeEvaluationView struct {
	EpisodeNumber int      `json:"episode_number"`
	EpisodeTitle  string   `json:"episode_title,omitempty"`
	UserRating    *float64 `json:"user_rating"` // nil se não avaliado; 0 é válido!
}

type SeasonEvaluationView struct {
	SeasonNumber     int                     `json:"season_number"`
	UserRating       *float64                `json:"user_rating"`       // Nota manual da temporada
	CalculatedRating *float64                `json:"calculated_rating"` // Média calculada dos episódios avaliados
	Episodes         []EpisodeEvaluationView `json:"episodes"`
}

type SeriesHierarchyView struct {
	MediaID          string                 `json:"media_id"`
	UserRating       *float64               `json:"user_rating"`       // Nota manual da série
	CalculatedRating *float64               `json:"calculated_rating"` // Média calculada das temporadas com média
	Seasons          []SeasonEvaluationView `json:"seasons"`
}
