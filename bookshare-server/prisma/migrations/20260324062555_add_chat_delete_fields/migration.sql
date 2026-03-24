-- AlterTable
ALTER TABLE "borrows" ADD COLUMN     "chatAutoDeleteAt" TIMESTAMP(3),
ADD COLUMN     "chatDeletedBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
