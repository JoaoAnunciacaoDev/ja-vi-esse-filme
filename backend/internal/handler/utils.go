package handler

import (
	"time"
)

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
