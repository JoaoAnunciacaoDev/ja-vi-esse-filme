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
