import { DiscordChannel, TelegramKey } from '@prisma/client';

export type DiscordChannelConnection = {
  uniqueKeys: TelegramKey[];
} & DiscordChannel;

export type TelegramChannelConnection = {
  DiscordChannels: DiscordChannel[];
} & TelegramKey;
