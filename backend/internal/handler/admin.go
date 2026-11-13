package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

// AdminDashboardStatsHandler retorna métricas agregadas da plataforma para a administração
func AdminDashboardStatsHandler(c *gin.Context) {
	var totalUsers int64
	_ = db.Model(&schemas.User{}).Count(&totalUsers).Error

	var totalMedia int64
	_ = db.Model(&schemas.MediaItem{}).Count(&totalMedia).Error

	var totalMovies int64
	_ = db.Model(&schemas.MediaItem{}).Where("type = 'movie'").Count(&totalMovies).Error

	var totalSeries int64
	_ = db.Model(&schemas.MediaItem{}).Where("type = 'tv'").Count(&totalSeries).Error

	var totalWatchLogs int64
	_ = db.Model(&schemas.WatchLog{}).Count(&totalWatchLogs).Error

	var totalReviews int64
	_ = db.Model(&schemas.WatchLog{}).Where("rating > 0 OR review != ''").Count(&totalReviews).Error

	// Novos usuários nos últimos 30 dias
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	var newUsersLast30Days int64
	_ = db.Model(&schemas.User{}).Where("created_at >= ?", thirtyDaysAgo).Count(&newUsersLast30Days).Error

	// Usuários ativos no mês atual (com sessões assistidas)
	currentMonth := time.Now().Format("2006-01")
	var activeUsersThisMonth int64
	_ = db.Model(&schemas.WatchLog{}).
		Where("watched_at >= ? AND watched_at <= ?", currentMonth+"-01", currentMonth+"-31").
		Distinct("user_id").
		Count(&activeUsersThisMonth).Error

	// Usuários mais ativos (Top Cinéfilos)
	type CinephileSummary struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		TotalLogs   int64  `json:"total_logs"`
	}

	var topCinephiles []CinephileSummary
	_ = db.Table("users").
		Select("users.id, users.username, users.display_name, COUNT(watch_logs.id) as total_logs").
		Joins("LEFT JOIN watch_logs ON watch_logs.user_id = users.id").
		Group("users.id, users.username, users.display_name").
		Order("total_logs DESC").
		Limit(5).
		Scan(&topCinephiles).Error

	c.JSON(http.StatusOK, gin.H{
		"overview": gin.H{
			"total_users":             totalUsers,
			"new_users_last_30_days":  newUsersLast30Days,
			"active_users_this_month": activeUsersThisMonth,
			"total_media":             totalMedia,
			"total_movies":            totalMovies,
			"total_series":            totalSeries,
			"total_watch_logs":        totalWatchLogs,
			"total_reviews":           totalReviews,
		},
		"top_cinephiles": topCinephiles,
	})
}

type AdminUserView struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	Role        string    `json:"role"`
	IsPrivate   bool      `json:"is_private"`
	TotalLogs   int64     `json:"total_logs"`
	TotalMedia  int64     `json:"total_media"`
	CreatedAt   time.Time `json:"created_at"`
}

// AdminListUsersHandler lista todos os usuários da plataforma com paginação e filtros
func AdminListUsersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	queryStr := strings.TrimSpace(c.Query("q"))
	roleFilter := strings.TrimSpace(c.Query("role"))

	query := db.Model(&schemas.User{})

	if queryStr != "" {
		pattern := "%" + queryStr + "%"
		query = query.Where("username LIKE ? OR email LIKE ? OR display_name LIKE ?", pattern, pattern, pattern)
	}

	if roleFilter != "" {
		query = query.Where("role = ?", strings.ToUpper(roleFilter))
	}

	var total int64
	query.Count(&total)

	var users []schemas.User
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar usuários")
		return
	}

	userViews := make([]AdminUserView, 0, len(users))

	if len(users) > 0 {
		userIDs := make([]string, len(users))
		for i, u := range users {
			userIDs[i] = u.ID
		}

		type UserTotal struct {
			UserID string `gorm:"column:user_id"`
			Total  int64  `gorm:"column:total"`
		}

		var logsCount []UserTotal
		_ = db.Model(&schemas.WatchLog{}).
			Select("user_id, COUNT(*) as total").
			Where("user_id IN (?)", userIDs).
			Group("user_id").
			Scan(&logsCount).Error
		logsMap := make(map[string]int64, len(logsCount))
		for _, lc := range logsCount {
			logsMap[lc.UserID] = lc.Total
		}

		var mediaCount []UserTotal
		_ = db.Model(&schemas.UserMedia{}).
			Select("user_id, COUNT(*) as total").
			Where("user_id IN (?)", userIDs).
			Group("user_id").
			Scan(&mediaCount).Error
		mediaMap := make(map[string]int64, len(mediaCount))
		for _, mc := range mediaCount {
			mediaMap[mc.UserID] = mc.Total
		}

		for _, u := range users {
			userViews = append(userViews, AdminUserView{
				ID:          u.ID,
				Email:       u.Email,
				Username:    u.Username,
				DisplayName: u.DisplayName,
				Role:        u.Role,
				IsPrivate:   u.IsPrivate,
				TotalLogs:   logsMap[u.ID],
				TotalMedia:  mediaMap[u.ID],
				CreatedAt:   u.CreatedAt,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"users": userViews,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

type UpdateUserRoleRequest struct {
	Role string `json:"role"`
}

// AdminUpdateUserRoleHandler altera os privilégios de um usuário (USER ou SUPERUSER)
func AdminUpdateUserRoleHandler(c *gin.Context) {
	currentAdmin := c.MustGet("currentUser").(*schemas.User)
	userID := c.Param("id")

	var req UpdateUserRoleRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	newRole := strings.ToUpper(strings.TrimSpace(req.Role))
	if newRole != "USER" && newRole != "SUPERUSER" {
		sendError(c, http.StatusBadRequest, "o papel deve ser 'USER' ou 'SUPERUSER'")
		return
	}

	// Impede que o próprio admin revogue seus próprios privilégios
	if currentAdmin.ID == userID && newRole != "SUPERUSER" {
		sendError(c, http.StatusForbidden, "você não pode remover seus próprios privilégios de administrador")
		return
	}

	var targetUser schemas.User
	if err := db.First(&targetUser, "id = ?", userID).Error; err != nil {
		sendError(c, http.StatusNotFound, "usuário não encontrado")
		return
	}

	targetUser.Role = newRole
	targetUser.UpdatedAt = time.Now()

	if err := db.Save(&targetUser).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao alterar papel do usuário")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Papel do usuário atualizado com sucesso",
		"user_id": targetUser.ID,
		"role":    targetUser.Role,
	})
}
