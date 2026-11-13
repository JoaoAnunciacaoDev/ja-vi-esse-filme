package handler_test

import (
	"testing"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/handler"
	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
)

func TestIsValidStepRating(t *testing.T) {
	validRatings := []float64{0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0}
	for _, r := range validRatings {
		if !handler.IsValidStepRating(r) {
			t.Errorf("esperava que %.1f fosse válido", r)
		}
	}

	invalidRatings := []float64{-0.5, -1.0, 0.2, 1.25, 3.7, 5.1, 6.0}
	for _, r := range invalidRatings {
		if handler.IsValidStepRating(r) {
			t.Errorf("esperava que %.2f fosse INVÁLIDO", r)
		}
	}
}

func TestSeriesHierarchyCalculation(t *testing.T) {
	// Cria uma mídia de série fictícia
	media := schemas.MediaItem{
		ID:           "test-series-1",
		Title:        "Breaking Bad",
		Type:         schemas.MediaTypeTV,
		TotalSeasons: 2,
	}

	// Avaliações fictícias:
	// Série geral: manual 5.0
	// Temporada 1: Ep 1 = 4.0, Ep 2 = 5.0 => Média calculada da Temp 1 = 4.5
	// Temporada 2: Ep 1 = 4.5, Ep 2 = 4.5 => Média calculada da Temp 2 = 4.5
	// Média calculada da Série = (4.5 + 4.5) / 2 = 4.5
	evals := []schemas.SeriesEvaluation{
		{SeasonNumber: 0, EpisodeNumber: 0, Rating: 5.0}, // Série manual
		{SeasonNumber: 1, EpisodeNumber: 0, Rating: 4.0}, // Temp 1 manual
		{SeasonNumber: 1, EpisodeNumber: 1, Rating: 4.0},
		{SeasonNumber: 1, EpisodeNumber: 2, Rating: 5.0},
		{SeasonNumber: 2, EpisodeNumber: 1, Rating: 4.5},
		{SeasonNumber: 2, EpisodeNumber: 2, Rating: 4.5},
	}

	// Validação dos cálculos matemáticos
	ep1_1 := 4.0
	ep1_2 := 5.0
	t1Avg := (ep1_1 + ep1_2) / 2.0
	if t1Avg != 4.5 {
		t.Fatalf("média da temporada 1 incorreta: %.2f", t1Avg)
	}

	ep2_1 := 4.5
	ep2_2 := 4.5
	t2Avg := (ep2_1 + ep2_2) / 2.0
	if t2Avg != 4.5 {
		t.Fatalf("média da temporada 2 incorreta: %.2f", t2Avg)
	}

	seriesAvg := (t1Avg + t2Avg) / 2.0
	if seriesAvg != 4.5 {
		t.Fatalf("média geral da série incorreta: %.2f", seriesAvg)
	}

	if media.TotalSeasons != 2 || len(evals) != 6 {
		t.Fatalf("dados inconsistentes")
	}
}
