-- Add ImgBB API key to wp_connections (per-user, encrypted)
-- Run with: wrangler d1 execute wordpress-mcp-db --remote --file=./migrations/0002_add_imgbb_api_key.sql

ALTER TABLE wp_connections ADD COLUMN imgbb_api_key_encrypted TEXT;
