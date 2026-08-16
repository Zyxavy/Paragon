-- Recovery codes are now stored hashed at rest (SHA-256 in code_hash).
-- Legacy rows keep the raw code in `code` and a NULL code_hash; they remain
-- verifiable via the legacy fallback in lib/recovery.ts and are replaced on
-- the next regeneration.
ALTER TABLE recovery_codes ADD COLUMN code_hash TEXT;