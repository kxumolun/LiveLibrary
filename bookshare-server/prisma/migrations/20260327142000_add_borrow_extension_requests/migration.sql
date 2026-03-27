DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ExtensionRequestStatus'
  ) THEN
    CREATE TYPE "ExtensionRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
  END IF;
END
$$;

ALTER TABLE "borrows"
ADD COLUMN IF NOT EXISTS "dueSoonReminderSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "extensionStatus" "ExtensionRequestStatus",
ADD COLUMN IF NOT EXISTS "extensionReason" TEXT,
ADD COLUMN IF NOT EXISTS "extensionDays" INTEGER,
ADD COLUMN IF NOT EXISTS "extensionRequestedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "extensionRespondedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "extensionCount" INTEGER NOT NULL DEFAULT 0;
