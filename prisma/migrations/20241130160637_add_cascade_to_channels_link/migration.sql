-- DropForeignKey
ALTER TABLE "ChannelsLink" DROP CONSTRAINT "ChannelsLink_telegramKeyRecordId_fkey";

-- AddForeignKey
ALTER TABLE "ChannelsLink" ADD CONSTRAINT "ChannelsLink_telegramKeyRecordId_fkey" FOREIGN KEY ("telegramKeyRecordId") REFERENCES "TelegramKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
