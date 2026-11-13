package router

import (
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/handler"
	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"gorm.io/gorm"
)

func initializeRoutes(r *gin.Engine, cfg *config.Config, db *gorm.DB) {
	// Inicializa os manipuladores com as dependências do banco e configuração
	handler.InitializeHandler(db, cfg)

	// Health Check ativo
	r.GET("/api/health", handler.HealthCheckHandler)

	// Rate Limiter contra força bruta: até 5 requisições rápidas por IP
	authRateLimit := middleware.RateLimiter(rate.Every(3*time.Second), 5)
	// Rate Limiter para busca externa
	searchRateLimit := middleware.RateLimiter(rate.Every(1*time.Second), 10)

	api := r.Group("/api")
	{
		// Endpoints de Autenticação
		api.POST("/auth/register", authRateLimit, handler.RegisterHandler)
		api.POST("/auth/login", authRateLimit, handler.LoginHandler)
		api.POST("/auth/logout", handler.LogoutHandler)
		api.GET("/auth/me", middleware.RequireAuth(), handler.MeHandler)

		// Administração (SUPERUSER)
		admin := api.Group("/admin")
		admin.Use(middleware.RequireAuth(), middleware.RequireRole("SUPERUSER"))
		{
			admin.GET("/stats", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"status":  "authorized",
					"message": "Painel de administração acessado com sucesso",
				})
			})
			admin.GET("/dashboard", handler.AdminDashboardStatsHandler)
			admin.GET("/users", handler.AdminListUsersHandler)
			admin.PUT("/users/:id/role", handler.AdminUpdateUserRoleHandler)
			admin.GET("/patch-notes", handler.AdminListAllPatchNotesHandler)
			admin.POST("/patch-notes", handler.AdminCreatePatchNoteHandler)
			admin.PUT("/patch-notes/:id", handler.AdminUpdatePatchNoteHandler)
			admin.DELETE("/patch-notes/:id", handler.AdminDeletePatchNoteHandler)
		}

		// Catálogo de Mídias (Filmes e Séries)
		api.GET("/media", handler.ListMediaHandler)
		api.GET("/media/:id", handler.ShowMediaHandler)
		api.GET("/media/search-external", searchRateLimit, handler.SearchExternalMediaHandler)
		api.POST("/media", middleware.RequireAuth(), handler.CreateMediaHandler)
		api.POST("/media/import", middleware.RequireAuth(), handler.ImportMediaHandler)
		api.GET("/media/:id/reviews", handler.ListMediaReviewsHandler)

		// Minha Lista / Watchlist (Videoteca do Usuário)
		watchlist := api.Group("/watchlist")
		watchlist.Use(middleware.RequireAuth())
		{
			watchlist.GET("", handler.ListUserMediaHandler)
			watchlist.POST("", handler.AddToUserMediaHandler)
			watchlist.PUT("/:id", handler.UpdateUserMediaHandler)
			watchlist.DELETE("/:id", handler.DeleteUserMediaHandler)
			watchlist.PATCH("/:id/favorite", handler.ToggleMediaFavoriteHandler)
			watchlist.PATCH("/:id/collection", handler.ToggleMediaInCollectionHandler)
		}

		// Sistema de Avaliações Hierárquico para Séries (Série, Temporadas e Episódios)
		seriesEvals := api.Group("/series-evaluations")
		seriesEvals.Use(middleware.RequireAuth())
		{
			seriesEvals.GET("/:media_id", handler.GetSeriesEvaluationHandler)
			seriesEvals.POST("", handler.SetSeriesEvaluationHandler)
			seriesEvals.DELETE("/:media_id", handler.DeleteSeriesEvaluationHandler)
			seriesEvals.GET("/:media_id/season/:season_number", handler.GetSeasonEpisodesHandler)
		}

		// Diário de Sessões e Avaliações (Watch Logs)
		watchLogs := api.Group("/watch-logs")
		watchLogs.Use(middleware.RequireAuth())
		{
			watchLogs.POST("", handler.CreateWatchLogHandler)
			watchLogs.GET("", handler.ListWatchLogsHandler)
			watchLogs.GET("/summary", handler.GetWatchLogSummaryHandler)
			watchLogs.PUT("/:id", handler.UpdateWatchLogHandler)
			watchLogs.DELETE("/:id", handler.DeleteWatchLogHandler)
		}

		// Estatísticas e Dashboard
		stats := api.Group("/stats")
		stats.Use(middleware.RequireAuth())
		{
			stats.GET("/dashboard", handler.GetDashboardStatsHandler)
			stats.GET("/heatmap", handler.GetHeatmapHandler)
		}

		// Funcionalidades Sociais & Perfis
		users := api.Group("/users")
		users.Use(middleware.RequireAuth())
		{
			users.GET("/search", handler.SearchUsersHandler)
			users.GET("/profile/:username", handler.GetUserProfileHandler)
			users.PUT("/me/profile", handler.UpdateProfileHandler)
			users.GET("/me/privacy", handler.GetPrivacySettingsHandler)
			users.PUT("/me/privacy", handler.UpdatePrivacySettingsHandler)
			users.POST("/:username/follow", handler.FollowUserHandler)
			users.DELETE("/:username/follow", handler.UnfollowUserHandler)
			users.GET("/:username/followers", handler.ListFollowersHandler)
			users.GET("/:username/following", handler.ListFollowingHandler)
			users.GET("/me/pending-follows", handler.ListPendingFollowsHandler)
			users.POST("/follows/:id/respond", handler.RespondFollowRequestHandler)
		}

		social := api.Group("/social")
		social.Use(middleware.RequireAuth())
		{
			social.GET("/feed", handler.GetFeedHandler)
			social.GET("/rankings", handler.GetLeaderboardHandler)
			social.GET("/activities/:id/likes", handler.ListActivityLikesHandler)
			social.POST("/activities/:id/like", handler.ToggleActivityLikeHandler)
			social.GET("/activities/:id/comments", handler.ListActivityCommentsHandler)
			social.POST("/activities/:id/comments", handler.CreateActivityCommentHandler)
			social.DELETE("/comments/:id", handler.DeleteActivityCommentHandler)
		}

		// Patch Notes (Notas de Atualização)
		api.GET("/patch-notes", handler.ListPublishedPatchNotesHandler)
		api.GET("/patch-notes/latest", handler.GetLatestPatchNoteHandler)
		api.GET("/patch-notes/:id", handler.GetPatchNoteHandler)

		// Notificações Push
		api.GET("/notifications/vapid-public-key", handler.GetVapidPublicKeyHandler)
		notifications := api.Group("/notifications")
		notifications.Use(middleware.RequireAuth())
		{
			notifications.POST("/subscribe", handler.SubscribePushHandler)
			notifications.POST("/unsubscribe", handler.UnsubscribePushHandler)
			notifications.GET("/settings", handler.GetNotificationSettingsHandler)
			notifications.PUT("/settings", handler.UpdateNotificationSettingsHandler)
			notifications.POST("/test", handler.SendTestNotificationHandler)
		}

		// Cron Jobs
		api.GET("/cron/reminders", handler.CronRemindersHandler)
		api.POST("/cron/reminders", handler.CronRemindersHandler)
	}
}
