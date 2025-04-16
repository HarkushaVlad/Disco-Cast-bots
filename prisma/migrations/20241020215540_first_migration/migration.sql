-- CreateTable
CREATE TABLE "TelegramKey" (
    "id" SERIAL NOT NULL,
    "telegramChannelId" BIGINT NOT NULL,
    "uniqueKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TelegramKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordChannel" (
    "id" SERIAL NOT NULL,
    "discordChannelId" BIGINT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "DiscordChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChannelUniqueKey" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramKey_telegramChannelId_key" ON "TelegramKey"("telegramChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramKey_uniqueKey_key" ON "TelegramKey"("uniqueKey");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordChannel_discordChannelId_key" ON "DiscordChannel"("discordChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "_ChannelUniqueKey_AB_unique" ON "_ChannelUniqueKey"("A", "B");

-- CreateIndex
CREATE INDEX "_ChannelUniqueKey_B_index" ON "_ChannelUniqueKey"("B");

-- AddForeignKey
ALTER TABLE "_ChannelUniqueKey" ADD CONSTRAINT "_ChannelUniqueKey_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChannelUniqueKey" ADD CONSTRAINT "_ChannelUniqueKey_B_fkey" FOREIGN KEY ("B") REFERENCES "TelegramKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
