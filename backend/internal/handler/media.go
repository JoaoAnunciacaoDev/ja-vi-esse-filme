package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ListMediaHandler lista as mídias salvas no banco
func ListMediaHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := strings.TrimSpace(c.Query("q"))
	mediaType := strings.TrimSpace(c.Query("type"))

	dbQuery := db.Model(&schemas.MediaItem{})
	if query != "" {
		dbQuery = dbQuery.Where("LOWER(title) LIKE ? OR LOWER(original_title) LIKE ?", "%"+strings.ToLower(query)+"%", "%"+strings.ToLower(query)+"%")
	}
	if mediaType == "movie" || mediaType == "tv" {
		dbQuery = dbQuery.Where("type = ?", mediaType)
	}

	var total int64
	dbQuery.Count(&total)

	var items []schemas.MediaItem
	if err := dbQuery.Order("created_at DESC").Offset(offset).Limit(limit).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar mídias"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

// ShowMediaHandler exibe os dados de uma mídia por ID, com nota média
func ShowMediaHandler(c *gin.Context) {
	id := c.Param("id")

	var item schemas.MediaItem
	if err := db.First(&item, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Mídia não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao carregar mídia"})
		return
	}

	// Calcula média de avaliações dos usuários para essa mídia
	type RatingStats struct {
		AvgRating   float64 `json:"avg_rating"`
		TotalReviews int64   `json:"total_reviews"`
	}
	var stats RatingStats
	db.Model(&schemas.WatchLog{}).
		Where("media_id = ? AND rating > 0", id).
		Select("COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total_reviews").
		Scan(&stats)

	c.JSON(http.StatusOK, gin.H{
		"media":         item,
		"avg_rating":    stats.AvgRating,
		"total_reviews": stats.TotalReviews,
	})
}

// CreateMediaHandler cria um filme ou série manual
func CreateMediaHandler(c *gin.Context) {
	userID, _ := c.Get("userID")
	userStr, _ := userID.(string)

	var input schemas.CreateMediaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	item := schemas.MediaItem{
		ID:            uuid.New().String(),
		TMDBID:        input.TMDBID,
		IMDBID:        input.IMDBID,
		Type:          input.Type,
		Title:         input.Title,
		OriginalTitle: input.OriginalTitle,
		Overview:      input.Overview,
		PosterURL:     input.PosterURL,
		BackdropURL:   input.BackdropURL,
		ReleaseDate:   input.ReleaseDate,
		Year:          input.Year,
		Runtime:       input.Runtime,
		Genres:        input.Genres,
		Director:      input.Director,
		CastMembers:   input.CastMembers,
		TotalSeasons:  input.TotalSeasons,
		TotalEpisodes: input.TotalEpisodes,
	}
	if userStr != "" {
		item.CreatedBy = &userStr
	}

	if err := db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar mídia"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Mídia criada com sucesso",
		"media":   item,
	})
}

// ImportMediaHandler importa uma mídia do TMDB / busca externa (ou reutiliza se já salva)
func ImportMediaHandler(c *gin.Context) {
	var input schemas.CreateMediaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	// 1. Se já existir pelo TMDBID, retorna a existente
	if input.TMDBID != nil && *input.TMDBID > 0 {
		var existing schemas.MediaItem
		if err := db.Where("tmdb_id = ?", *input.TMDBID).First(&existing).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{
				"message": "Mídia já cadastrada",
				"media":   existing,
			})
			return
		}
	}

	// 2. Se não existir, cadastra
	userID, _ := c.Get("userID")
	userStr, _ := userID.(string)

	item := schemas.MediaItem{
		ID:            uuid.New().String(),
		TMDBID:        input.TMDBID,
		IMDBID:        input.IMDBID,
		Type:          input.Type,
		Title:         input.Title,
		OriginalTitle: input.OriginalTitle,
		Overview:      input.Overview,
		PosterURL:     input.PosterURL,
		BackdropURL:   input.BackdropURL,
		ReleaseDate:   input.ReleaseDate,
		Year:          input.Year,
		Runtime:       input.Runtime,
		Genres:        input.Genres,
		Director:      input.Director,
		CastMembers:   input.CastMembers,
		TotalSeasons:  input.TotalSeasons,
		TotalEpisodes: input.TotalEpisodes,
	}
	if userStr != "" {
		item.CreatedBy = &userStr
	}

	if err := db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao importar mídia"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Mídia importada com sucesso",
		"media":   item,
	})
}
