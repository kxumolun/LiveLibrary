/*
  Warnings:

  - The values [OVERDUE] on the enum `BorrowStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BorrowStatus_new" AS ENUM ('PENDING_HANDOVER', 'ACTIVE', 'PENDING_RETURN', 'RETURNED', 'CANCELLED');
ALTER TABLE "borrows" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "borrows" ALTER COLUMN "status" TYPE "BorrowStatus_new" USING ("status"::text::"BorrowStatus_new");
ALTER TYPE "BorrowStatus" RENAME TO "BorrowStatus_old";
ALTER TYPE "BorrowStatus_new" RENAME TO "BorrowStatus";
DROP TYPE "BorrowStatus_old";
ALTER TABLE "borrows" ALTER COLUMN "status" SET DEFAULT 'PENDING_HANDOVER';
COMMIT;

-- AlterTable
ALTER TABLE "borrows" ADD COLUMN     "handoverExpiry" TIMESTAMP(3),
ADD COLUMN     "handoverOtp" TEXT,
ADD COLUMN     "returnExpiry" TIMESTAMP(3),
ADD COLUMN     "returnOtp" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_HANDOVER';
