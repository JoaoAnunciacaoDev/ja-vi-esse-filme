package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateWatchLogHandler registra uma experiência assistida (filme ou episódio de série)
func CreateWatchLogHandler(c *gin.Context) {
	userID, _ := c.Get("userID")
	userStr := userID.(string)

	var input schemas.CreateWatchLogInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	// 1. Valida se a mídia existe
	var media schemas.MediaItem
	if err := db.First(&media, "id = ?", input.MediaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mídia não encontrada"})
		return
	}

	mediaType := media.Type
	if input.MediaType != "" {
		mediaType = input.MediaType
	}

	now := time.Now()

	// 2. Localiza ou cria a entrada na videoteca do usuário (user_media)
	var userMedia schemas.UserMedia
	hasUserMedia := false
	if err := db.Where("user_id = ? AND media_id = ?", userStr, input.MediaID).First(&userMedia).Error; err == nil {
		hasUserMedia = true
		// Atualiza progresso da série ou marca como concluído se for filme
		if mediaType == schemas.MediaTypeMovie {
			userMedia.Status = schemas.StatusCompleted
			if userMedia.FinishedAt == nil {
				userMedia.FinishedAt = &now
			}
		} else {
			if input.SeasonNumber > userMedia.CurrentSeason {
				userMedia.CurrentSeason = input.SeasonNumber
			}
			if input.EpisodeNumber > userMedia.CurrentEpisode {
				userMedia.CurrentEpisode = input.EpisodeNumber
			}
		}
		userMedia.UpdatedAt = now
		db.Save(&userMedia)
	} else {
		// Cria automaticamente em user_media
		userMedia = schemas.UserMedia{
			ID:             uuid.New().String(),
			UserID:         userStr,
			MediaID:        input.MediaID,
			Status:         schemas.StatusCompleted,
			InCollection:   true,
			CurrentSeason:  input.SeasonNumber,
			CurrentEpisode: input.EpisodeNumber,
			FinishedAt:     &now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if mediaType == schemas.MediaTypeTV && input.EpisodeNumber > 0 {
			userMedia.Status = schemas.StatusWatching
		}
		if err := db.Create(&userMedia).Error; err == nil {
			hasUserMedia = true
		}
	}

	// 3. Cria o registro de visualização (WatchLog)
	logItem := schemas.WatchLog{
		ID:               uuid.New().String(),
		UserID:           userStr,
		MediaID:          input.MediaID,
		WatchedAt:        input.WatchedAt,
		MediaType:        mediaType,
		SeasonNumber:     input.SeasonNumber,
		EpisodeNumber:    input.EpisodeNumber,
		EpisodeTitle:     input.EpisodeTitle,
		Platform:         input.Platform,
		IsRewatch:        input.IsRewatch,
		Rating:           input.Rating,
		Review:           input.Review,
		ContainsSpoilers: input.ContainsSpoilers,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if hasUserMedia {
		logItem.UserMediaID = &userMedia.ID
	}

	if err := db.Create(&logItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar registro de visualização"})
		return
	}

	// 4. Cria atividade social no feed
	actType := schemas.ActivityWatchedMovie
	if mediaType == schemas.MediaTypeTV {
		if input.EpisodeNumber > 0 {
			actType = schemas.ActivityWatchedEpisode
		} else {
			actType = schemas.ActivityWatchedSeason
		}
	}
	if input.Rating > 0 || input.Review != "" {
		actType = schemas.ActivityRatedMedia
	}

	meta, _ := json.Marshal(gin.H{
		"media_title":    media.Title,
		"poster_url":     media.PosterURL,
		"media_type":     mediaType,
		"season_number":  input.SeasonNumber,
		"episode_number": input.EpisodeNumber,
		"platform":       input.Platform,
		"is_rewatch":     input.IsRewatch,
		"rating":         input.Rating,
		"review":         input.Review,
	})
	activity := schemas.Activity{
		ID:         uuid.New().String(),
		UserID:     userStr,
		Type:       actType,
		MediaID:    &media.ID,
		WatchLogID: &logItem.ID,
		Metadata:   string(meta),
		CreatedAt:  now,
	}
	db.Create(&activity)

	db.Preload("Media").First(&logItem, "id = ?", logItem.ID)
	c.JSON(http.StatusCreated, gin.H{
		"message": "Experiência registrada com sucesso!",
		"log":     logItem,
	})
}

// ListWatchLogsHandler retorna o diário de visualizações do usuário
func ListWatchLogsHandler(c *gin.Context) {
	userID, _ := c.Get("userID")
	userStr := userID.(string)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	mediaID := c.Query("media_id")
	mediaType := c.Query("media_type")

	query := db.Model(&schemas.WatchLog{}).Where("user_id = ?", userStr)
	if mediaID != "" {
		query = query.Where("media_id = ?", mediaID)
	}
	if mediaType != "" {
		query = query.Where("media_type = ?", mediaType)
	}

	var total int64
	query.Count(&total)

	var logs []schemas.WatchLog
	if err := query.Preload("Media").Order("watched_at DESC, created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar registros"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": logs,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

// GetWatchLogSummaryHandler calcula métricas gerais do que o usuário já viu
func GetWatchLogSummaryHandler(c *gin.Context) {
	userID, _ := c.Get("userID")
	userStr := userID.(string)

	var totalLogs int64
	var totalMovies int64
	var totalEpisodes int64
	var avgRating float64
	var totalRewatches int64

	db.Model(&schemas.WatchLog{}).Where("user_id = ?", userStr).Count(&totalLogs)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND media_type = 'movie'", userStr).Count(&totalMovies)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND media_type = 'tv'", userStr).Count(&totalEpisodes)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND is_rewatch = true", userStr).Count(&totalRewatches)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND rating > 0", userStr).Select("COALESCE(AVG(rating), 0)").Scan(&avgRating)

	c.JSON(http.StatusOK, gin.H{
		"total_logs":      totalLogs,
		"total_movies":    totalMovies,
		"total_episodes":  totalEpisodes,
		"total_rewatches": totalRewatches,
		"avg_rating":      avgRating,
	})
}

// UpdateWatchLogHandler edita um registro de visualização ou avaliação
func UpdateWatchLogHandler(c *gin.Context) {
	userID, _ := c.Get("userID")
	userStr := userID.(string)
	id := c.Param("id")

	var item schemas.WatchLog
	if err := db.Where("id = ? AND user_id = ?", id, userStr).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Registro não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar registro"})
		return
	}

	var input schemas.UpdateWatchLogInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	if input.WatchedAt != nil {
		item.WatchedAt = *input.WatchedAt
	}
	if input.SeasonNumber != nil {
		item.SeasonNumber = *input.SeasonNumber
	}
	if input.EpisodeNumber != nil {
		item.EpisodeNumber = *input.EpisodeNumber
	}
	if input.EpisodeTitle != nil {
		item.EpisodeTitle = *input.EpisodeTitle
	}
	if input.Platform != nil {
		item.Platform = *input.Platform
	}
	if input.IsRewatch != nil {
		item.IsRewatch = *input.IsRewatch
	}
	if input.Rating != nil {
		item.Rating = *input.Rating
	}
	if input.Review != nil {
		item.Review = *input.Review
	}
	if input.ContainsSpoilers != nil {
		item.ContainsSpoilers = *input.ContainsSpoilers
	}
	item.UpdatedAt = time.Now()

	if err := db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar registro"})
		return
	}

	db.Preload("Media").First(&item, "id = ?", item.ID)
	c.JSON(http.StatusOK, gin.H{
		"message": "Registro atualizado com sucesso",
		"log":     item,
	})
}

// DeleteWatchLogHandler remove um registro de visualização
func DeleteWatchLogHandler(c *gin.Context) {
	userID, _ := c.Get("userID")
	userStr := userID.(string)
	id := c.Param("id")

	res := db.Where("id = ? AND user_id = ?", id, userStr).Delete(&schemas.WatchLog{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao excluir registro"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registro não encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registro excluído com sucesso"})
}

// ListMediaReviewsHandler lista todas as avaliações públicas feitas para uma mídia
func ListMediaReviewsHandler(c *gin.Context) {
	mediaID := c.Param("id")

	type ReviewItem struct {
		ID               string    `json:"id"`
		UserID           string    `json:"user_id"`
		Username         string    `json:"username"`
		AvatarURL        string    `json:"avatar_url"`
		Rating           float64   `json:"rating"`
		Review           string    `json:"review"`
		ContainsSpoilers bool      `json:"contains_spoilers"`
		WatchedAt        string    `json:"watched_at"`
		IsRewatch        bool      `json:"is_rewatch"`
		Platform         string    `json:"platform"`
		CreatedAt        time.Time `json:"created_at"`
	}

	var reviews []ReviewItem
	err := db.Table("watch_logs").
		Select("watch_logs.id, watch_logs.user_id, users.username, users.avatar_url, watch_logs.rating, watch_logs.review, watch_logs.contains_spoilers, watch_logs.watched_at, watch_logs.is_rewatch, watch_logs.platform, watch_logs.created_at").
		Joins("JOIN users ON users.id = watch_logs.user_id").
		Where("watch_logs.media_id = ? AND (watch_logs.rating > 0 OR watch_logs.review != '')", mediaID).
		Order("watch_logs.created_at DESC").
		Limit(50).
		Scan(&reviews).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar avaliações"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reviews": reviews})
}
