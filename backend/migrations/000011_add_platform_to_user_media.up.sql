ALTER TABLE user_media ADD COLUMN platform TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_user_media_platform ON user_media(platform);
