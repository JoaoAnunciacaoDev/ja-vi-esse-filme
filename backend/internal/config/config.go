package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	Env             string
	DBDriver        string
	DBSource        string
	SessionSecret   string
	FrontendURL     string
	TmdbAPIKey      string
	VapidPublicKey  string
	VapidPrivateKey string
	VapidSubject    string
	CronSecret      string
}

// Load lê o arquivo .env e retorna um ponteiro para a struct Config preenchida com as variáveis de ambiente.
func Load() *Config {
	envPaths := []string{".env", "backend/.env", "../.env", "../../.env"}
	loaded := false
	for _, p := range envPaths {
		if err := godotenv.Load(p); err == nil {
			log.Printf("Arquivo .env carregado com sucesso de: %s\n", p)
			loaded = true
			break
		}
	}
	if !loaded {
		log.Println("Aviso: nenhum arquivo .env encontrado, lendo variáveis do sistema.")
	}

	rawDriver := strings.ToLower(strings.TrimSpace(getEnv("DB_DRIVER", "sqlite")))
	if rawDriver == "postgresql" {
		rawDriver = "postgres"
	}

	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		Env:               getEnv("ENV", "development"),
		DBDriver:          rawDriver,
		DBSource:          getEnv("DB_SOURCE", "javiessefilme.db"),
		SessionSecret:   getEnv("SESSION_SECRET", "javiessefilme-secret-key-12345"),
		FrontendURL:     getEnv("FRONTEND_URL", "http://localhost:5173"),
		TmdbAPIKey:      getEnv("TMDB_API_KEY", ""),
		VapidPublicKey:  getEnv("VAPID_PUBLIC_KEY", ""),
		VapidPrivateKey: getEnv("VAPID_PRIVATE_KEY", ""),
		VapidSubject:    getEnv("VAPID_SUBJECT", "mailto:suporte@javiessefilme.app"),
		CronSecret:      getEnv("CRON_SECRET", ""),
	}

	// Validação estrita para ambiente de produção
	if cfg.Env == "production" {
		if cfg.SessionSecret == "javiessefilme-secret-key-12345" || len(cfg.SessionSecret) < 32 {
			log.Fatal("ERRO DE SEGURANÇA: SESSION_SECRET obrigatório com no mínimo 32 caracteres em ambiente de produção!")
		}
	}

	return cfg
}

// getEnv tenta conseguir as variáveis de ambiente, em caso de falha retorna um fallback.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}

	return fallback
}
