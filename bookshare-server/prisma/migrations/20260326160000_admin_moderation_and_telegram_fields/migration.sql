-- Add admin moderation & telegram verification fields

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "telegramChatId" BIGINT,
  ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "telegramVerifiedAt" TIMESTAMP(3);

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3);

