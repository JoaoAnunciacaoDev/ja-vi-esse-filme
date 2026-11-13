CREATE TABLE IF NOT EXISTS series_evaluations (
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
);

CREATE INDEX IF NOT EXISTS idx_series_evaluations_user_media 
ON series_evaluations(user_id, media_id);

CREATE INDEX IF NOT EXISTS idx_series_evaluations_lookup 
ON series_evaluations(user_id, media_id, season_number, episode_number);
