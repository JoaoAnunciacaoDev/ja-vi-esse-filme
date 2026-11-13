package handler

import (
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

type MonthlyWatchStat struct {
	Month string `json:"month"`
	Count int64  `json:"count"`
}

type PlatformStat struct {
	Platform string `json:"platform"`
	Count    int64  `json:"count"`
}

type HeatmapDay struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// GetDashboardStatsHandler calcula estatísticas agregadas de filmes e séries do usuário
func GetDashboardStatsHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}

	now := time.Now()
	currentYear := now.Format("2006")
	currentMonth := now.Format("2006-01")

	// 1. Contagens na videoteca (user_media)
	var planToWatchCount int64
	var watchingCount int64
	var completedCount int64
	var favoritesCount int64

	db.Model(&schemas.UserMedia{}).Where("user_id = ? AND status = 'plan_to_watch'", userStr).Count(&planToWatchCount)
	db.Model(&schemas.UserMedia{}).Where("user_id = ? AND status = 'watching'", userStr).Count(&watchingCount)
	db.Model(&schemas.UserMedia{}).Where("user_id = ? AND status = 'completed'", userStr).Count(&completedCount)
	db.Model(&schemas.UserMedia{}).Where("user_id = ? AND favorite = true", userStr).Count(&favoritesCount)

	// 2. Métricas de visualização (watch_logs)
	var totalLogs int64
	var totalMovies int64
	var totalEpisodes int64
	var totalRewatches int64
	var avgRating float64

	db.Model(&schemas.WatchLog{}).Where("user_id = ?", userStr).Count(&totalLogs)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND media_type = 'movie'", userStr).Count(&totalMovies)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND media_type = 'tv'", userStr).Count(&totalEpisodes)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND is_rewatch = true", userStr).Count(&totalRewatches)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND rating > 0", userStr).Select("COALESCE(AVG(rating), 0)").Scan(&avgRating)

	// Assistidos este ano e este mês
	var watchedThisYear int64
	var watchedThisMonth int64
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND watched_at >= ?", userStr, currentYear+"-01-01").Count(&watchedThisYear)
	db.Model(&schemas.WatchLog{}).Where("user_id = ? AND watched_at >= ? AND watched_at <= ?", userStr, currentMonth+"-01", currentMonth+"-31").Count(&watchedThisMonth)

	// 3. Distribuição por plataforma
	var platformStats []PlatformStat
	db.Model(&schemas.WatchLog{}).
		Select("COALESCE(NULLIF(platform, ''), 'Outro') as platform, COUNT(*) as count").
		Where("user_id = ?", userStr).
		Group("platform").
		Order("count DESC").
		Limit(8).
		Scan(&platformStats)

	// 4. Últimos 6 meses
	monthlyMap := make(map[string]int64)
	for i := 5; i >= 0; i-- {
		m := now.AddDate(0, -i, 0).Format("2006-01")
		monthlyMap[m] = 0
	}

	type MonthRow struct {
		Month string `gorm:"column:m"`
		Count int64  `gorm:"column:c"`
	}
	var monthRows []MonthRow
	sixMonthsAgo := now.AddDate(0, -5, 0).Format("2006-01") + "-01"
	db.Table("watch_logs").
		Select("SUBSTR(watched_at, 1, 7) as m, COUNT(*) as c").
		Where("user_id = ? AND watched_at >= ?", userStr, sixMonthsAgo).
		Group("m").
		Scan(&monthRows)

	for _, mr := range monthRows {
		if _, ok := monthlyMap[mr.Month]; ok {
			monthlyMap[mr.Month] = mr.Count
		}
	}

	monthlyStats := make([]MonthlyWatchStat, 0, len(monthlyMap))
	for i := 5; i >= 0; i-- {
		m := now.AddDate(0, -i, 0).Format("2006-01")
		monthlyStats = append(monthlyStats, MonthlyWatchStat{
			Month: m,
			Count: monthlyMap[m],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"overview": gin.H{
			"total_logs":         totalLogs,
			"total_movies":       totalMovies,
			"total_episodes":     totalEpisodes,
			"total_rewatches":    totalRewatches,
			"avg_rating":         avgRating,
			"watched_this_year":  watchedThisYear,
			"watched_this_month": watchedThisMonth,
			"plan_to_watch":      planToWatchCount,
			"watching":           watchingCount,
			"completed":          completedCount,
			"favorites":          favoritesCount,
		},
		"platforms": platformStats,
		"monthly":   monthlyStats,
	})
}

// GetHeatmapHandler retorna os dias com registros de visualização no último ano
func GetHeatmapHandler(c *gin.Context) {
	userStr := getCurrentUserID(c)
	if userStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não autenticado"})
		return
	}

	oneYearAgo := time.Now().AddDate(-1, 0, 0).Format("2006-01-02")

	var days []HeatmapDay
	db.Table("watch_logs").
		Select("watched_at as date, COUNT(*) as count").
		Where("user_id = ? AND watched_at >= ?", userStr, oneYearAgo).
		Group("watched_at").
		Order("watched_at ASC").
		Scan(&days)

	c.JSON(http.StatusOK, gin.H{"days": days})
}
