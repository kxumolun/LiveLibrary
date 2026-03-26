-- Performance indexes for frequent filters/sorts.
CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt");
CREATE INDEX IF NOT EXISTS "users_city_idx" ON "users"("city");
CREATE INDEX IF NOT EXISTS "users_isBlocked_idx" ON "users"("isBlocked");
CREATE INDEX IF NOT EXISTS "users_telegramUsername_idx" ON "users"("telegramUsername");

CREATE INDEX IF NOT EXISTS "books_ownerId_idx" ON "books"("ownerId");
CREATE INDEX IF NOT EXISTS "books_status_idx" ON "books"("status");
CREATE INDEX IF NOT EXISTS "books_createdAt_idx" ON "books"("createdAt");
CREATE INDEX IF NOT EXISTS "books_isHidden_idx" ON "books"("isHidden");
CREATE INDEX IF NOT EXISTS "books_city_idx" ON "books"("city");
CREATE INDEX IF NOT EXISTS "books_meetupLat_meetupLng_idx" ON "books"("meetupLat", "meetupLng");

CREATE INDEX IF NOT EXISTS "borrow_requests_bookId_idx" ON "borrow_requests"("bookId");
CREATE INDEX IF NOT EXISTS "borrow_requests_requesterId_idx" ON "borrow_requests"("requesterId");
CREATE INDEX IF NOT EXISTS "borrow_requests_status_idx" ON "borrow_requests"("status");
CREATE INDEX IF NOT EXISTS "borrow_requests_requestedAt_idx" ON "borrow_requests"("requestedAt");

CREATE INDEX IF NOT EXISTS "borrows_bookId_idx" ON "borrows"("bookId");
CREATE INDEX IF NOT EXISTS "borrows_borrowerId_idx" ON "borrows"("borrowerId");
CREATE INDEX IF NOT EXISTS "borrows_status_idx" ON "borrows"("status");
CREATE INDEX IF NOT EXISTS "borrows_dueAt_idx" ON "borrows"("dueAt");

CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");

CREATE INDEX IF NOT EXISTS "messages_borrowId_idx" ON "messages"("borrowId");
CREATE INDEX IF NOT EXISTS "messages_senderId_idx" ON "messages"("senderId");
CREATE INDEX IF NOT EXISTS "messages_receiverId_idx" ON "messages"("receiverId");
CREATE INDEX IF NOT EXISTS "messages_createdAt_idx" ON "messages"("createdAt");
