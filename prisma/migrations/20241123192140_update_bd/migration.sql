/*
  Warnings:

  - You are about to drop the `_ChannelUniqueKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ChannelUniqueKey" DROP CONSTRAINT "_ChannelUniqueKey_A_fkey";

-- DropForeignKey
ALTER TABLE "_ChannelUniqueKey" DROP CONSTRAINT "_ChannelUniqueKey_B_fkey";

-- DropTable
DROP TABLE "_ChannelUniqueKey";

-- CreateTable
CREATE TABLE "_DiscordChannelTelegramKey" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DiscordChannelTelegramKey_AB_unique" ON "_DiscordChannelTelegramKey"("A", "B");

-- CreateIndex
CREATE INDEX "_DiscordChannelTelegramKey_B_index" ON "_DiscordChannelTelegramKey"("B");

-- AddForeignKey
ALTER TABLE "_DiscordChannelTelegramKey" ADD CONSTRAINT "_DiscordChannelTelegramKey_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscordChannelTelegramKey" ADD CONSTRAINT "_DiscordChannelTelegramKey_B_fkey" FOREIGN KEY ("B") REFERENCES "TelegramKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
