CREATE TABLE IF NOT EXISTS patch_notes (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    changes TEXT NOT NULL, -- JSON array of strings
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patch_notes_published ON patch_notes(published_at DESC);
