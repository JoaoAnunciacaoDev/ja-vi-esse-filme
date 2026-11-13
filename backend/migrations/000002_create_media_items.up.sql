CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    imdb_id TEXT,
    type TEXT NOT NULL DEFAULT 'movie', -- 'movie' ou 'tv'
    title TEXT NOT NULL,
    original_title TEXT,
    overview TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    release_date TEXT,
    year INTEGER,
    runtime INTEGER NOT NULL DEFAULT 0, -- minutos
    genres TEXT,
    director TEXT,
    cast_members TEXT,
    total_seasons INTEGER NOT NULL DEFAULT 0,
    total_episodes INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_items_title ON media_items(title);
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_tmdb_id ON media_items(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_media_items_year ON media_items(year);
