package handler_test

import (
	"testing"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
)

func TestMediaItemModel(t *testing.T) {
	item := schemas.MediaItem{
		ID:    "test-1",
		Title: "Interestelar",
		Type:  schemas.MediaTypeMovie,
		Year:  2014,
	}

	if item.Title != "Interestelar" {
		t.Errorf("esperava título Interestelar, obteve %s", item.Title)
	}
	if item.Type != schemas.MediaTypeMovie {
		t.Errorf("esperava tipo movie, obteve %s", item.Type)
	}
}

func TestWatchLogModel(t *testing.T) {
	log := schemas.WatchLog{
		ID:        "log-1",
		UserID:    "user-1",
		MediaID:   "media-1",
		WatchedAt: "2026-11-12",
		Platform:  "Cinema",
		Rating:    4.5,
		Review:    "Experiência incrível na telona!",
		IsRewatch: true,
	}

	if log.Platform != "Cinema" {
		t.Errorf("esperava plataforma Cinema, obteve %s", log.Platform)
	}
	if log.Rating != 4.5 {
		t.Errorf("esperava nota 4.5, obteve %f", log.Rating)
	}
	if !log.IsRewatch {
		t.Errorf("esperava is_rewatch ser true")
	}
}

func TestSameTitleDistinctMovies(t *testing.T) {
	tmdb1996 := 4232
	tmdb2022 := 646385

	movie1 := schemas.MediaItem{
		ID:     "scream-1996",
		TMDBID: &tmdb1996,
		Title:  "Pânico",
		Year:   1996,
		Type:   schemas.MediaTypeMovie,
	}

	movie2 := schemas.MediaItem{
		ID:     "scream-2022",
		TMDBID: &tmdb2022,
		Title:  "Pânico",
		Year:   2022,
		Type:   schemas.MediaTypeMovie,
	}

	if movie1.Title != movie2.Title {
		t.Fatalf("esperava títulos idênticos para testar diferenciação por ano e TMDB ID")
	}

	if *movie1.TMDBID == *movie2.TMDBID {
		t.Fatalf("esperava TMDB IDs distintos")
	}

	if movie1.Year == movie2.Year {
		t.Fatalf("esperava anos de lançamento distintos")
	}
}
