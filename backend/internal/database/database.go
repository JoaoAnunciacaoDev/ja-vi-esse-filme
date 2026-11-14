package database

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// SanitizePostgresPoolerURL remove apenas parâmetros incompatíveis com drivers legados,
// preservando o endpoint -pooler do Neon para uso em runtime serverless.
func SanitizePostgresPoolerURL(rawURL string) string {
	cleaned := strings.ReplaceAll(rawURL, "&channel_binding=require", "")
	cleaned = strings.ReplaceAll(cleaned, "channel_binding=require&", "")
	cleaned = strings.ReplaceAll(cleaned, "?channel_binding=require", "?")
	return strings.TrimRight(cleaned, "?&")
}

// SanitizePostgresURL limpa parâmetros conflitantes e remove "-pooler." para conexões diretas (ex: migrações).
func SanitizePostgresURL(rawURL string) string {
	cleaned := SanitizePostgresPoolerURL(rawURL)
	cleaned = strings.ReplaceAll(cleaned, "-pooler.", ".")
	return strings.TrimRight(cleaned, "?&")
}

// SyncSchemas sincroniza schemas GORM garantindo compatibilidade.
// Se as tabelas principais não existirem (banco novo ou migração pendente no Postgres/Neon),
// executa as migrações SQL embutidas diretamente e AutoMigrate de segurança.
// Se já existirem no Postgres, evita introspecções lentas de rede para manter o cold start instantâneo (<200ms).
func SyncSchemas(db *gorm.DB) error {
	models := []interface{}{
		&schemas.User{},
		&schemas.Session{},
		&schemas.MediaItem{},
		&schemas.UserMedia{},
		&schemas.WatchLog{},
		&schemas.Follow{},
		&schemas.UserPrivacySettings{},
		&schemas.Activity{},
		&schemas.PushSubscription{},
		&schemas.NotificationSettings{},
		&schemas.PatchNote{},
		&schemas.ActivityLike{},
		&schemas.ActivityComment{},
		&schemas.SeriesEvaluation{},
	}

	// 1. DDLs diretos idempotentes para máxima resiliência (garante tabelas e colunas críticas no Postgres)
	if db.Dialector.Name() == "postgres" {
		_ = db.Exec("ALTER TABLE user_media ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT '';").Error
		_ = db.Exec("CREATE INDEX IF NOT EXISTS idx_user_media_platform ON user_media(platform);").Error
		_ = db.Exec(`CREATE TABLE IF NOT EXISTS series_evaluations (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			media_id TEXT NOT NULL,
			season_number INTEGER NOT NULL DEFAULT 0,
			episode_number INTEGER NOT NULL DEFAULT 0,
			rating REAL NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE,
			UNIQUE(user_id, media_id, season_number, episode_number)
		);`).Error
		_ = db.Exec("CREATE INDEX IF NOT EXISTS idx_series_evaluations_user_media ON series_evaluations(user_id, media_id);").Error
		_ = db.Exec("CREATE INDEX IF NOT EXISTS idx_series_evaluations_lookup ON series_evaluations(user_id, media_id, season_number, episode_number);").Error
	}

	hasMediaItems := db.Migrator().HasTable("media_items")
	hasUsers := db.Migrator().HasTable("users")

	if !hasMediaItems || !hasUsers {
		log.Println("[SyncSchemas] Tabelas base ('media_items' / 'users') não encontradas. Inicializando estrutura do banco...")
		if sqlDB, err := db.DB(); err == nil {
			if migErr := ExecuteEmbeddedMigrationsDirectly(sqlDB); migErr != nil {
				log.Printf("[SyncSchemas] Aviso ao executar migrações diretas: %v", migErr)
			}
		}
		for _, m := range models {
			if err := db.AutoMigrate(m); err != nil {
				log.Printf("[AutoMigrate] aviso ao sincronizar %T: %v", m, err)
			}
		}
		log.Println("[SyncSchemas] Tabelas e schemas inicializados com sucesso!")
	} else {
		// Sincroniza tabelas críticas adicionadas recentemente caso não existam
		if !db.Migrator().HasTable("series_evaluations") {
			_ = db.AutoMigrate(&schemas.SeriesEvaluation{})
		}
		if !db.Migrator().HasColumn(&schemas.UserMedia{}, "platform") {
			_ = db.AutoMigrate(&schemas.UserMedia{})
		}
		if db.Dialector.Name() == "sqlite" {
			for _, m := range models {
				if err := db.AutoMigrate(m); err != nil {
					log.Printf("[AutoMigrate] aviso ao sincronizar %T: %v", m, err)
				}
			}
		}
	}

	return nil
}

// Connect conecta ao banco de dados usando as configurações fornecidas e retorna uma instância do GORM DB.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.DBDriver {
	case "sqlite":
		dialector = sqlite.Open(cfg.DBSource)
	case "postgres", "postgresql":
		// Preserva -pooler. e desabilita prepared statements para compatibilidade com PgBouncer/Neon pooler
		poolerSource := SanitizePostgresPoolerURL(cfg.DBSource)
		dialector = postgres.New(postgres.Config{
			DSN:                  poolerSource,
			PreferSimpleProtocol: true,
		})
	default:
		return nil, fmt.Errorf("driver de banco de dados não suportado: %s", cfg.DBDriver)
	}

	logLevel := logger.Info
	if cfg.Env == "production" {
		logLevel = logger.Error
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao conectar ao banco de dados (%s): %w", cfg.DBDriver, err)
	}

	// SQLite não ativa chaves estrangeiras por padrão; habilitamos explicitamente
	if cfg.DBDriver == "sqlite" {
		if err := db.Exec("PRAGMA foreign_keys = ON;").Error; err != nil {
			return nil, fmt.Errorf("falha ao habilitar foreign keys no sqlite: %w", err)
		}
	} else if sqlDB, sqlErr := db.DB(); sqlErr == nil {
		// Ajusta pool para ambiente serverless (conexões curtas via pooler)
		sqlDB.SetMaxIdleConns(2)
		sqlDB.SetMaxOpenConns(5)
		sqlDB.SetConnMaxLifetime(3 * time.Minute)
	}

	log.Printf("Conectado ao banco de dados com sucesso (%s)", cfg.DBDriver)
	return db, nil
}
