-- AlterTable
ALTER TABLE `User` ADD COLUMN `userType` ENUM('normal', 'typeD', 'typeC', 'typeB', 'typeA') NOT NULL DEFAULT 'normal';
