package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// IsValidStepRating valida se a nota está no intervalo [0, 5] e com passos estritos de 0.5
func IsValidStepRating(r float64) bool {
	if r < 0 || r > 5 {
		return false
	}
	doubleR := r * 2.0
	return math.Abs(doubleR-math.Round(doubleR)) < 0.001
}

// computeSeriesHierarchy monta o DTO com notas manuais e médias calculadas automaticamente
func computeSeriesHierarchy(media schemas.MediaItem, evals []schemas.SeriesEvaluation) schemas.SeriesHierarchyView {
	hierarchy := schemas.SeriesHierarchyView{
		MediaID: media.ID,
		Seasons: make([]schemas.SeasonEvaluationView, 0),
	}

	// 1. Mapeia as avaliações existentes por (season, episode)
	evalMap := make(map[string]float64)
	for _, e := range evals {
		key := fmt.Sprintf("%d:%d", e.SeasonNumber, e.EpisodeNumber)
		evalMap[key] = e.Rating
	}

	// Nota manual da série como um todo (0:0)
	if r, ok := evalMap["0:0"]; ok {
		val := r
		hierarchy.UserRating = &val
	}

	// Determina a quantidade de temporadas a exibir
	totalSeasons := media.TotalSeasons
	if totalSeasons <= 0 {
		// Se não souber pelo cadastro, busca a maior temporada nas avaliações
		for _, e := range evals {
			if e.SeasonNumber > totalSeasons {
				totalSeasons = e.SeasonNumber
			}
		}
	}
	if totalSeasons <= 0 {
		totalSeasons = 1
	}

	var seasonsWithCalculatedAverage []float64

	// 2. Processa cada temporada
	for s := 1; s <= totalSeasons; s++ {
		seasonView := schemas.SeasonEvaluationView{
			SeasonNumber: s,
			Episodes:     make([]schemas.EpisodeEvaluationView, 0),
		}

		// Nota manual da temporada (s:0)
		seasonKey := fmt.Sprintf("%d:0", s)
		if r, ok := evalMap[seasonKey]; ok {
			val := r
			seasonView.UserRating = &val
		}

		// Coleta episódios avaliados desta temporada
		var episodeRatingsSum float64
		var episodeRatingsCount int

		// Busca a maior numeração de episódios avaliados nessa temporada
		maxEp := 0
		for _, e := range evals {
			if e.SeasonNumber == s && e.EpisodeNumber > maxEp {
				maxEp = e.EpisodeNumber
			}
		}

		// Adiciona todos os episódios que foram avaliados
		for ep := 1; ep <= maxEp; ep++ {
			epKey := fmt.Sprintf("%d:%d", s, ep)
			if r, ok := evalMap[epKey]; ok {
				val := r
				episodeRatingsSum += r
				episodeRatingsCount++
				seasonView.Episodes = append(seasonView.Episodes, schemas.EpisodeEvaluationView{
					EpisodeNumber: ep,
					UserRating:    &val,
				})
			}
		}

		// Regra: "A média de uma temporada deve considerar somente os episódios que possuem avaliação."
		// "Caso não existam avaliações suficientes para calcular uma média, exiba um estado vazio em vez de atribuir uma nota artificial."
		if episodeRatingsCount > 0 {
			calc := episodeRatingsSum / float64(episodeRatingsCount)
			seasonView.CalculatedRating = &calc
			seasonsWithCalculatedAverage = append(seasonsWithCalculatedAverage, calc)
		}

		hierarchy.Seasons = append(hierarchy.Seasons, seasonView)
	}

	// 3. Regra: "O sistema também deve calcular automaticamente a média geral da série com base nas notas calculadas de suas temporadas."
	// "A média da série deve considerar somente as temporadas que possuem avaliações de episódios suficientes para gerar uma média."
	if len(seasonsWithCalculatedAverage) > 0 {
		var sumSeasons float64
		for _, sc := range seasonsWithCalculatedAverage {
			sumSeasons += sc
		}
		seriesCalc := sumSeasons / float64(len(seasonsWithCalculatedAverage))
		hierarchy.CalculatedRating = &seriesCalc
	}

	return hierarchy
}

// GetSeriesEvaluationHandler retorna a hierarquia completa de avaliações de uma série
func GetSeriesEvaluationHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}
	mediaID := c.Param("media_id")

	var media schemas.MediaItem
	if err := db.First(&media, "id = ?", mediaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mídia não encontrada"})
		return
	}

	var evals []schemas.SeriesEvaluation
	db.Where("user_id = ? AND media_id = ?", userStr, mediaID).Find(&evals)

	hierarchy := computeSeriesHierarchy(media, evals)
	c.JSON(http.StatusOK, hierarchy)
}

// SetSeriesEvaluationHandler adiciona ou atualiza uma avaliação (série, temporada ou episódio)
func SetSeriesEvaluationHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}

	var input schemas.SetSeriesEvaluationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	// Validação estrita da escala de 0 a 5 com passos de 0.5
	if !IsValidStepRating(input.Rating) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "A nota deve estar entre 0 e 5, com incrementos de 0,5 (permitidos: 0; 0,5; 1; 1,5; 2; 2,5; 3; 3,5; 4; 4,5; 5).",
		})
		return
	}

	var media schemas.MediaItem
	if err := db.First(&media, "id = ?", input.MediaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mídia não encontrada"})
		return
	}

	now := time.Now()
	eval := schemas.SeriesEvaluation{
		ID:            uuid.New().String(),
		UserID:        userStr,
		MediaID:       input.MediaID,
		SeasonNumber:  input.SeasonNumber,
		EpisodeNumber: input.EpisodeNumber,
		Rating:        input.Rating,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Upsert para garantir unicidade de (user_id, media_id, season_number, episode_number)
	err := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "user_id"},
			{Name: "media_id"},
			{Name: "season_number"},
			{Name: "episode_number"},
		},
		DoUpdates: clause.AssignmentColumns([]string{"rating", "updated_at"}),
	}).Create(&eval).Error

	if err != nil {
		// Fallback compatível se clause.OnConflict falhar
		var existing schemas.SeriesEvaluation
		if findErr := db.Where("user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?",
			userStr, input.MediaID, input.SeasonNumber, input.EpisodeNumber).First(&existing).Error; findErr == nil {
			existing.Rating = input.Rating
			existing.UpdatedAt = now
			db.Save(&existing)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar avaliação: " + err.Error()})
			return
		}
	}

	// Retorna a hierarquia atualizada
	var allEvals []schemas.SeriesEvaluation
	db.Where("user_id = ? AND media_id = ?", userStr, input.MediaID).Find(&allEvals)

	hierarchy := computeSeriesHierarchy(media, allEvals)
	c.JSON(http.StatusOK, gin.H{
		"message":   "Avaliação salva com sucesso",
		"hierarchy": hierarchy,
	})
}

// DeleteSeriesEvaluationHandler remove uma avaliação (série, temporada ou episódio)
func DeleteSeriesEvaluationHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}
	mediaID := c.Param("media_id")

	seasonStr := c.DefaultQuery("season", "0")
	episodeStr := c.DefaultQuery("episode", "0")
	seasonNum, _ := strconv.Atoi(seasonStr)
	episodeNum, _ := strconv.Atoi(episodeStr)

	var media schemas.MediaItem
	if err := db.First(&media, "id = ?", mediaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mídia não encontrada"})
		return
	}

	db.Where("user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?",
		userStr, mediaID, seasonNum, episodeNum).Delete(&schemas.SeriesEvaluation{})

	var allEvals []schemas.SeriesEvaluation
	db.Where("user_id = ? AND media_id = ?", userStr, mediaID).Find(&allEvals)

	hierarchy := computeSeriesHierarchy(media, allEvals)
	c.JSON(http.StatusOK, gin.H{
		"message":   "Avaliação removida com sucesso",
		"hierarchy": hierarchy,
	})
}

type tmdbEpisodeItem struct {
	EpisodeNumber int    `json:"episode_number"`
	Name          string `json:"name"`
	Overview      string `json:"overview"`
	Runtime       int    `json:"runtime"`
	AirDate       string `json:"air_date"`
}

type tmdbSeasonResponse struct {
	Episodes []tmdbEpisodeItem `json:"episodes"`
}

// GetSeasonEpisodesHandler busca os episódios de uma temporada via TMDB
func GetSeasonEpisodesHandler(c *gin.Context) {
	mediaID := c.Param("media_id")
	seasonStr := c.Param("season_number")
	seasonNum, err := strconv.Atoi(seasonStr)
	if err != nil || seasonNum < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Número de temporada inválido"})
		return
	}

	var media schemas.MediaItem
	if err := db.First(&media, "id = ?", mediaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mídia não encontrada"})
		return
	}

	type EpisodeResult struct {
		EpisodeNumber int    `json:"episode_number"`
		Name          string `json:"name"`
		Overview      string `json:"overview,omitempty"`
		AirDate       string `json:"air_date,omitempty"`
	}

	episodes := make([]EpisodeResult, 0)

	// Se tiver TMDB ID e TMDB API KEY, busca os dados oficiais dos episódios
	tmdbKey := cfg.TmdbAPIKey
	if tmdbKey == "" {
		tmdbKey = os.Getenv("TMDB_API_KEY")
	}

	if media.TMDBID != nil && *media.TMDBID > 0 && tmdbKey != "" {
		endpoint := fmt.Sprintf("https://api.themoviedb.org/3/tv/%d/season/%d?api_key=%s&language=pt-BR", *media.TMDBID, seasonNum, tmdbKey)
		client := &http.Client{Timeout: 5 * time.Second}
		if resp, err := client.Get(endpoint); err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			if body, readErr := io.ReadAll(resp.Body); readErr == nil {
				var seasonResp tmdbSeasonResponse
				if jsonErr := json.Unmarshal(body, &seasonResp); jsonErr == nil {
					for _, ep := range seasonResp.Episodes {
						episodes = append(episodes, EpisodeResult{
							EpisodeNumber: ep.EpisodeNumber,
							Name:          ep.Name,
							Overview:      ep.Overview,
							AirDate:       ep.AirDate,
						})
					}
				}
			}
		}
	}

	// Se o TMDB não retornou ou não está configurado, gera slots com base nas informações disponíveis
	if len(episodes) == 0 {
		defaultCount := 10
		for ep := 1; ep <= defaultCount; ep++ {
			episodes = append(episodes, EpisodeResult{
				EpisodeNumber: ep,
				Name:          fmt.Sprintf("Episódio %d", ep),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"season_number": seasonNum,
		"episodes":      episodes,
	})
}
