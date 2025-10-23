-- AlterTable
ALTER TABLE `PublicSettings` ADD COLUMN `headerMask` INTEGER NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE `UserSettings` ADD COLUMN `headerMask` INTEGER NOT NULL DEFAULT 25;
