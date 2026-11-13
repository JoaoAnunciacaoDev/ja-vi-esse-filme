package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

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
	userStr := getCurrentUserID(c)

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

	// Sanitiza TMDBID: se menor ou igual a 0, deixa nil para evitar conflito de chave única no SQL
	if input.TMDBID != nil && *input.TMDBID <= 0 {
		input.TMDBID = nil
	}

	// 1. Se já existir pelo TMDBID, retorna a existente (identificador canônico único)
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

	// 2. Se for cadastro manual (sem TMDBID), busca por título, tipo e ano para evitar duplicatas,
	// mas NUNCA substitui obras distintas com mesmo nome (ex: Pânico 1996 e Pânico 2022).
	if input.TMDBID == nil && input.Title != "" {
		var existingByTitle schemas.MediaItem
		query := db.Where("LOWER(title) = ? AND type = ?", strings.ToLower(input.Title), input.Type)
		if input.Year > 0 {
			query = query.Where("year = ?", input.Year)
		}
		if err := query.First(&existingByTitle).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{
				"message": "Mídia já cadastrada",
				"media":   existingByTitle,
			})
			return
		}
	}

	// 3. Se não existir, cadastra com timestamps e segurança de FK
	userStr := getCurrentUserID(c)
	now := time.Now()

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
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if userStr != "" {
		var count int64
		if err := db.Model(&schemas.User{}).Where("id = ?", userStr).Count(&count).Error; err == nil && count > 0 {
			item.CreatedBy = &userStr
		}
	}

	if err := db.Create(&item).Error; err != nil {
		// Se houve concorrência ou conflito de chave única, tenta recuperar novamente
		if input.TMDBID != nil && *input.TMDBID > 0 {
			var existing schemas.MediaItem
			if findErr := db.Where("tmdb_id = ?", *input.TMDBID).First(&existing).Error; findErr == nil {
				c.JSON(http.StatusOK, gin.H{
					"message": "Mídia já cadastrada",
					"media":   existing,
				})
				return
			}
		}

		if input.TMDBID == nil && input.Title != "" {
			var existingByTitle schemas.MediaItem
			query := db.Where("LOWER(title) = ? AND type = ?", strings.ToLower(input.Title), input.Type)
			if input.Year > 0 {
				query = query.Where("year = ?", input.Year)
			}
			if findErr := query.First(&existingByTitle).Error; findErr == nil {
				c.JSON(http.StatusOK, gin.H{
					"message": "Mídia já cadastrada",
					"media":   existingByTitle,
				})
				return
			}
		}

		log.Printf("[MEDIA_IMPORT_ERROR] Erro ao cadastrar mídia: %v (input: %+v)", err, input)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar mídia: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Mídia importada com sucesso",
		"media":   item,
	})
}
