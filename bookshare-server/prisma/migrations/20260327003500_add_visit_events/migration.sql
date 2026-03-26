CREATE TABLE IF NOT EXISTS "visit_events" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "visit_events_createdAt_idx" ON "visit_events"("createdAt");
CREATE INDEX IF NOT EXISTS "visit_events_visitorId_idx" ON "visit_events"("visitorId");
CREATE INDEX IF NOT EXISTS "visit_events_path_idx" ON "visit_events"("path");
CREATE INDEX IF NOT EXISTS "visit_events_visitorId_createdAt_idx" ON "visit_events"("visitorId", "createdAt");
