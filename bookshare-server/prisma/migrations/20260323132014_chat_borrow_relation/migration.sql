/*
  Warnings:

  - You are about to drop the column `bookId` on the `messages` table. All the data in the column will be lost.
  - Added the required column `borrowId` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "messages" DROP COLUMN "bookId",
ADD COLUMN     "borrowId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_borrowId_fkey" FOREIGN KEY ("borrowId") REFERENCES "borrows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
