/*
  Warnings:

  - You are about to drop the column `linksJson` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `linksJson`,
    ADD COLUMN `linksJsonA` JSON NULL,
    ADD COLUMN `linksJsonB` JSON NULL;
