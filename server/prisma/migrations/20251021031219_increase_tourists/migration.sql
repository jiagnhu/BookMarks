-- CreateTable
CREATE TABLE `PublicSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `boardAlpha` INTEGER NOT NULL DEFAULT 55,
    `cardAlpha` INTEGER NOT NULL DEFAULT 55,
    `vignette` INTEGER NOT NULL DEFAULT 25,
    `showcaseWidth` INTEGER NOT NULL DEFAULT 28,
    `contrast` BOOLEAN NOT NULL DEFAULT false,
    `skinUrl` VARCHAR(512) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublicPage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` ENUM('A', 'B') NOT NULL,
    `title` VARCHAR(128) NULL,
    `motto` VARCHAR(255) NULL,
    `bPasswordHash` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PublicPage_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublicBookmark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pageId` INTEGER NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PublicBookmark_pageId_orderIndex_idx`(`pageId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PublicBookmark` ADD CONSTRAINT `PublicBookmark_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `PublicPage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
