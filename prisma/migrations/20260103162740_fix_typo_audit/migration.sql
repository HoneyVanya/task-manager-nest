/*
  Warnings:

  - You are about to drop the column `craetedAt` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `createdAt` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "craetedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL;
