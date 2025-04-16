/*
  Warnings:

  - Added the required column `ownerId` to the `TelegramKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TelegramKey" ADD COLUMN     "ownerId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "TelegramUser" (
    "id" INTEGER NOT NULL,

    CONSTRAINT "TelegramUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUser_id_key" ON "TelegramUser"("id");

-- AddForeignKey
ALTER TABLE "TelegramKey" ADD CONSTRAINT "TelegramKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TelegramUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
