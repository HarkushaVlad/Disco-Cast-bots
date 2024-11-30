/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `TelegramUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `ChannelsLink` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DiscordChannel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DiscordGuild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TelegramKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chatId` to the `TelegramUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TelegramUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `TelegramUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `TelegramUser` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "TelegramUser_id_key";

-- AlterTable
ALTER TABLE "ChannelsLink" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DiscordChannel" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DiscordGuild" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "preferredLocale" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TelegramKey" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
CREATE SEQUENCE telegramuser_id_seq;
ALTER TABLE "TelegramUser" ADD COLUMN     "chatId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "languageCode" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('telegramuser_id_seq');
ALTER SEQUENCE telegramuser_id_seq OWNED BY "TelegramUser"."id";

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUser_userId_key" ON "TelegramUser"("userId");
