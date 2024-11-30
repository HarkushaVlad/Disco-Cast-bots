/*
  Warnings:

  - You are about to drop the `_DiscordChannelTelegramKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_DiscordChannelTelegramKey" DROP CONSTRAINT "_DiscordChannelTelegramKey_A_fkey";

-- DropForeignKey
ALTER TABLE "_DiscordChannelTelegramKey" DROP CONSTRAINT "_DiscordChannelTelegramKey_B_fkey";

-- DropTable
DROP TABLE "_DiscordChannelTelegramKey";

-- CreateTable
CREATE TABLE "ChannelsLink" (
    "id" SERIAL NOT NULL,
    "telegramKeyRecordId" INTEGER NOT NULL,
    "discordChannelRecordId" INTEGER NOT NULL,
    "withSource" BOOLEAN NOT NULL DEFAULT false,
    "withHashtag" BOOLEAN NOT NULL DEFAULT false,
    "withMention" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChannelsLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelsLink_telegramKeyRecordId_discordChannelRecordId_key" ON "ChannelsLink"("telegramKeyRecordId", "discordChannelRecordId");

-- AddForeignKey
ALTER TABLE "ChannelsLink" ADD CONSTRAINT "ChannelsLink_telegramKeyRecordId_fkey" FOREIGN KEY ("telegramKeyRecordId") REFERENCES "TelegramKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelsLink" ADD CONSTRAINT "ChannelsLink_discordChannelRecordId_fkey" FOREIGN KEY ("discordChannelRecordId") REFERENCES "DiscordChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
