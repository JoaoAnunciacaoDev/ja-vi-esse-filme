package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ListUserMediaHandler lista as mídias da lista do usuário logado
func ListUserMediaHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}

	status := c.Query("status")
	favoritesOnly := c.Query("favorite") == "true"
	platform := c.Query("platform")

	query := db.Where("user_id = ?", userStr)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if favoritesOnly {
		query = query.Where("favorite = ?", true)
	}
	if platform != "" {
		query = query.Where("platform = ?", platform)
	}

	var list []schemas.UserMedia
	if err := query.Preload("Media").Order("updated_at DESC").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar sua videoteca"})
		return
	}

	// Enriquece mídias sem plataforma definida buscando o registro mais recente no diário
	for i := range list {
		if list[i].Platform == "" {
			var logPlatform string
			if err := db.Model(&schemas.WatchLog{}).
				Where("user_id = ? AND media_id = ? AND platform != ''", userStr, list[i].MediaID).
				Order("watched_at DESC, created_at DESC").
				Select("platform").
				Limit(1).
				Scan(&logPlatform).Error; err == nil && logPlatform != "" {
				list[i].Platform = logPlatform
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"items": list})
}

// AddToUserMediaHandler adiciona um filme ou série à lista pessoal do usuário
func AddToUserMediaHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}

	var input schemas.AddToUserMediaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	// 1. Verifica se a mídia existe
	var media schemas.MediaItem
	if err := db.First(&media, "id = ?", input.MediaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mídia não encontrada"})
		return
	}

	// 2. Verifica se o usuário já tem essa mídia na lista
	var existing schemas.UserMedia
	if err := db.Where("user_id = ? AND media_id = ?", userStr, input.MediaID).First(&existing).Error; err == nil {
		// Se já existir, apenas atualiza o status se fornecido
		if input.Status != "" {
			existing.Status = input.Status
		}
		if input.Favorite != nil {
			existing.Favorite = *input.Favorite
		}
		if input.Platform != nil {
			existing.Platform = *input.Platform
		}
		existing.InCollection = true
		existing.UpdatedAt = time.Now()
		db.Save(&existing)

		db.Preload("Media").First(&existing, "id = ?", existing.ID)
		c.JSON(http.StatusOK, gin.H{
			"message": "Item já estava na sua lista e foi atualizado",
			"item":    existing,
		})
		return
	}

	status := schemas.StatusPlanToWatch
	if input.Status != "" {
		status = input.Status
	}

	now := time.Now()
	item := schemas.UserMedia{
		ID:           uuid.New().String(),
		UserID:       userStr,
		MediaID:      input.MediaID,
		Status:       status,
		Favorite:     input.Favorite != nil && *input.Favorite,
		InCollection: input.InCollection == nil || *input.InCollection,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if input.CurrentSeason != nil {
		item.CurrentSeason = *input.CurrentSeason
	}
	if input.CurrentEpisode != nil {
		item.CurrentEpisode = *input.CurrentEpisode
	}
	if input.Platform != nil {
		item.Platform = *input.Platform
	}
	if status == schemas.StatusWatching {
		item.StartedAt = &now
	} else if status == schemas.StatusCompleted {
		item.StartedAt = &now
		item.FinishedAt = &now
	}

	if err := db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao adicionar à sua lista"})
		return
	}

	// Gera atividade social caso adicionado para assistir mais tarde
	meta, _ := json.Marshal(gin.H{
		"media_title": media.Title,
		"poster_url":  media.PosterURL,
		"media_type":  media.Type,
		"status":      item.Status,
	})
	act := schemas.Activity{
		ID:        uuid.New().String(),
		UserID:    userStr,
		Type:      schemas.ActivityAddedToWatchlist,
		MediaID:   &media.ID,
		Metadata:  string(meta),
		CreatedAt: now,
	}
	db.Create(&act)

	db.Preload("Media").First(&item, "id = ?", item.ID)
	c.JSON(http.StatusCreated, gin.H{
		"message": "Adicionado com sucesso",
		"item":    item,
	})
}

// UpdateUserMediaHandler atualiza status, progresso ou favoritos de um item da lista
func UpdateUserMediaHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}
	id := c.Param("id")

	var item schemas.UserMedia
	if err := db.Where("id = ? AND user_id = ?", id, userStr).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Item não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar item"})
		return
	}

	var input schemas.UpdateUserMediaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	now := time.Now()
	if input.Status != nil {
		item.Status = *input.Status
		if item.Status == schemas.StatusWatching && item.StartedAt == nil {
			item.StartedAt = &now
		} else if item.Status == schemas.StatusCompleted && item.FinishedAt == nil {
			item.FinishedAt = &now
		}
	}
	if input.Favorite != nil {
		item.Favorite = *input.Favorite
	}
	if input.InCollection != nil {
		item.InCollection = *input.InCollection
	}
	if input.CurrentSeason != nil {
		item.CurrentSeason = *input.CurrentSeason
	}
	if input.CurrentEpisode != nil {
		item.CurrentEpisode = *input.CurrentEpisode
	}
	if input.Platform != nil {
		item.Platform = *input.Platform
	}
	item.UpdatedAt = now

	if err := db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar item"})
		return
	}

	db.Preload("Media").First(&item, "id = ?", item.ID)
	c.JSON(http.StatusOK, gin.H{
		"message": "Item atualizado com sucesso",
		"item":    item,
	})
}

// DeleteUserMediaHandler remove um item da lista do usuário
func DeleteUserMediaHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}
	id := c.Param("id")

	res := db.Where("id = ? AND user_id = ?", id, userStr).Delete(&schemas.UserMedia{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover item"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item não encontrado na sua lista"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item removido com sucesso"})
}

// ToggleMediaFavoriteHandler favorita ou desfavorita
func ToggleMediaFavoriteHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}
	id := c.Param("id")

	var item schemas.UserMedia
	if err := db.Where("id = ? AND user_id = ?", id, userStr).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item não encontrado"})
		return
	}

	item.Favorite = !item.Favorite
	item.UpdatedAt = time.Now()
	db.Save(&item)

	c.JSON(http.StatusOK, gin.H{
		"favorite": item.Favorite,
		"message":  "Status de favorito alterado com sucesso",
	})
}

// ToggleMediaInCollectionHandler alterna visibilidade na coleção
func ToggleMediaInCollectionHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}
	id := c.Param("id")

	var item schemas.UserMedia
	if err := db.Where("id = ? AND user_id = ?", id, userStr).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item não encontrado"})
		return
	}

	item.InCollection = !item.InCollection
	item.UpdatedAt = time.Now()
	db.Save(&item)

	c.JSON(http.StatusOK, gin.H{
		"in_collection": item.InCollection,
		"message":       "Coleção atualizada",
	})
}
