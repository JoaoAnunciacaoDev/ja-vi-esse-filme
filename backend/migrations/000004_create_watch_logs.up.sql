CREATE TABLE IF NOT EXISTS watch_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    user_media_id TEXT,
    watched_at DATE NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'movie', -- 'movie' ou 'tv'
    season_number INTEGER NOT NULL DEFAULT 0, -- 0 para filme
    episode_number INTEGER NOT NULL DEFAULT 0, -- 0 para filme / temporada completa
    episode_title TEXT,
    platform TEXT, -- 'Cinema', 'Netflix', 'Prime Video', 'Max', 'Disney+', 'Apple TV+', 'Outro'
    is_rewatch BOOLEAN NOT NULL DEFAULT FALSE,
    rating REAL NOT NULL DEFAULT 0, -- 0 a 5 estrelas
    review TEXT, -- impressões / resenha da experiência
    contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_media_id) REFERENCES user_media(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_watch_logs_user_id ON watch_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_logs_media_id ON watch_logs(media_id);
CREATE INDEX IF NOT EXISTS idx_watch_logs_watched_at ON watch_logs(user_id, watched_at DESC);
