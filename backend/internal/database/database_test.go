package database

import (
	"database/sql"
	"testing"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/config"
	_ "github.com/mattn/go-sqlite3"
)

func TestExecuteEmbeddedMigrationsDirectly(t *testing.T) {
	sqlDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("falha ao abrir sqlite em memória: %v", err)
	}
	defer sqlDB.Close()

	if err := ExecuteEmbeddedMigrationsDirectly(sqlDB); err != nil {
		t.Fatalf("ExecuteEmbeddedMigrationsDirectly falhou: %v", err)
	}

	// Verifica se a tabela media_items foi criada
	var count int
	err = sqlDB.QueryRow("SELECT count(*) FROM media_items").Scan(&count)
	if err != nil {
		t.Fatalf("tabela media_items não existe após migração direta: %v", err)
	}

	// Verifica se a tabela users foi criada
	err = sqlDB.QueryRow("SELECT count(*) FROM users").Scan(&count)
	if err != nil {
		t.Fatalf("tabela users não existe após migração direta: %v", err)
	}

	// Verifica se a tabela user_media foi criada
	err = sqlDB.QueryRow("SELECT count(*) FROM user_media").Scan(&count)
	if err != nil {
		t.Fatalf("tabela user_media não existe após migração direta: %v", err)
	}

	// Verifica se a tabela watch_logs foi criada
	err = sqlDB.QueryRow("SELECT count(*) FROM watch_logs").Scan(&count)
	if err != nil {
		t.Fatalf("tabela watch_logs não existe após migração direta: %v", err)
	}

	// Verifica schema_migrations
	var version int64
	var dirty bool
	err = sqlDB.QueryRow("SELECT version, dirty FROM schema_migrations LIMIT 1").Scan(&version, &dirty)
	if err != nil {
		t.Fatalf("schema_migrations não foi populada: %v", err)
	}
	if version <= 0 || dirty {
		t.Errorf("versão inválida ou dirty: version=%d dirty=%v", version, dirty)
	}
}

func TestSyncSchemas_WithEmptyDB(t *testing.T) {
	cfg := &config.Config{
		DBDriver: "sqlite",
		DBSource: ":memory:",
		Env:      "test",
	}

	db, err := Connect(cfg)
	if err != nil {
		t.Fatalf("Connect falhou: %v", err)
	}

	if err := SyncSchemas(db); err != nil {
		t.Fatalf("SyncSchemas falhou: %v", err)
	}

	if !db.Migrator().HasTable("media_items") {
		t.Errorf("esperava tabela media_items criada pelo SyncSchemas")
	}
	if !db.Migrator().HasTable("user_media") {
		t.Errorf("esperava tabela user_media criada pelo SyncSchemas")
	}
}
