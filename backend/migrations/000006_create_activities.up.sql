CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'WATCHED_MOVIE', 'WATCHED_EPISODE', 'WATCHED_SEASON', 'ADDED_TO_WATCHLIST', 'RATED_MEDIA'
    media_id TEXT,
    watch_log_id TEXT,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE SET NULL,
    FOREIGN KEY (watch_log_id) REFERENCES watch_logs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
