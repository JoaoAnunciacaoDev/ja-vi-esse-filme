package main

import (
	"log"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/database"
	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/router"
)

func main() {
	// 1. Configurações
	cfg := config.Load()
	if cfg.TmdbAPIKey != "" {
		log.Println("[CONFIG] Provedor TMDB: ATIVADO (chave TMDB_API_KEY configurada)")
	} else {
		log.Println("[CONFIG][AVISO] TMDB_API_KEY não configurada. A busca de filmes e séries funcionará em modo fallback local.")
	}

	// 2. Banco de dados (com suporte a SQLite e PostgreSQL + Foreign Keys ativadas)
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Erro ao inicializar banco de dados: %v", err)
	}

	// Sincroniza schemas GORM garantindo que todas as tabelas e colunas existam
	if err := database.SyncSchemas(db); err != nil {
		log.Printf("Aviso ao sincronizar schemas GORM: %v", err)
	} else {
		log.Println("Schemas GORM sincronizados com sucesso!")
	}

	// 3. Executa as Migrações SQL embutidas diretamente no binário (embed.FS)
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Erro ao obter instância sql.DB: %v", err)
	}

	if err := database.RunMigrations(cfg.DBDriver, cfg.DBSource, sqlDB); err != nil {
		log.Printf("Aviso ao executar migrações: %v", err)
	} else {
		log.Println("Tabelas sincronizadas com sucesso via migrations embutidas!")
	}

	// 4. Inicializa o roteador e roda o servidor (estilo Go-Talent-Hub)
	router.Initialize(cfg, db)
}
