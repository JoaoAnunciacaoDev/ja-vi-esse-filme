package handler

import (
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

// getCurrentUserID extrai o ID do usuário de forma segura a partir do contexto Gin
func getCurrentUserID(c *gin.Context) string {
	if val, exists := c.Get("userID"); exists {
		if id, ok := val.(string); ok && id != "" {
			return id
		}
	}
	if userVal, exists := c.Get("currentUser"); exists {
		if u, ok := userVal.(*schemas.User); ok && u != nil {
			return u.ID
		}
	}
	return ""
}

// getTodayInTimezone retorna a data atual formatada como YYYY-MM-DD no timezone do usuário
func getTodayInTimezone(tz string) string {
	loc, err := time.LoadLocation(tz)
	if err != nil || loc == nil {
		loc = time.UTC
	}
	return time.Now().In(loc).Format("2006-01-02")
}

// getMonthDateBounds retorna os limites de data (primeiro e último dia) de um mês no formato YYYY-MM
func getMonthDateBounds(yearMonth string) (string, string, bool) {
	t, err := time.Parse("2006-01", yearMonth)
	if err != nil {
		return "", "", false
	}
	start := t.Format("2006-01-02")
	// Último dia do mês
	nextMonth := t.AddDate(0, 1, 0)
	lastDay := nextMonth.AddDate(0, 0, -1)
	end := lastDay.Format("2006-01-02")
	return start, end, true
}
