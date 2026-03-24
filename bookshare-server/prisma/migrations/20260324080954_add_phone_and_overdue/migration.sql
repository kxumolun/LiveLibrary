-- AlterEnum
ALTER TYPE "BorrowStatus" ADD VALUE 'OVERDUE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT;
