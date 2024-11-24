/*
  Warnings:

  - A unique constraint covering the columns `[discordChannelId]` on the table `DiscordChannel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DiscordChannel_discordChannelId_key" ON "DiscordChannel"("discordChannelId");
