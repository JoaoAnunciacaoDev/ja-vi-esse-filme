CREATE TABLE IF NOT EXISTS user_media (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'plan_to_watch', -- 'plan_to_watch', 'watching', 'completed', 'paused', 'dropped'
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    in_collection BOOLEAN NOT NULL DEFAULT TRUE,
    current_season INTEGER NOT NULL DEFAULT 0,
    current_episode INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE,
    UNIQUE(user_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON user_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_media_id ON user_media(media_id);
CREATE INDEX IF NOT EXISTS idx_user_media_status ON user_media(status);
CREATE INDEX IF NOT EXISTS idx_user_media_user_status ON user_media(user_id, status);
