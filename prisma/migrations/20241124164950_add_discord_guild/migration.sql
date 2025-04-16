/*
  Warnings:

  - You are about to drop the column `discordGuildId` on the `DiscordChannel` table. All the data in the column will be lost.
  - Added the required column `guildId` to the `DiscordChannel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiscordChannel" DROP COLUMN "discordGuildId",
ADD COLUMN     "guildId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "DiscordGuild" (
    "id" SERIAL NOT NULL,
    "discordGuildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DiscordGuild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordGuild_discordGuildId_key" ON "DiscordGuild"("discordGuildId");

-- AddForeignKey
ALTER TABLE "DiscordChannel" ADD CONSTRAINT "DiscordChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "DiscordGuild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
