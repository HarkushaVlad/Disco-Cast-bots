/*
  Warnings:

  - You are about to drop the column `description` on the `DiscordChannel` table. All the data in the column will be lost.
  - Added the required column `discordGuildId` to the `DiscordChannel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `DiscordChannel` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DiscordChannel_discordChannelId_key";

-- AlterTable
ALTER TABLE "DiscordChannel" DROP COLUMN "description",
ADD COLUMN     "discordGuildId" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "discordChannelId" SET DATA TYPE TEXT;
