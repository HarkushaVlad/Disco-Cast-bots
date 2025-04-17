import {
  ChannelsLink,
  DiscordChannel,
  DiscordGuild,
  TelegramKey,
} from '@prisma/client';

export type ExtendedChannelsLink = {
  telegramKey: TelegramKey;
  discordChannel: DiscordChannel;
} & ChannelsLink;

export type ChannelsLinkPayload = {
  telegramKey: TelegramKey;
  discordChannel: {
    guild: DiscordGuild;
  } & DiscordChannel;
} & ChannelsLink;

export type TelegramChannelForPost = {
  telegramChannelId: bigint;
  aiText?: string;
};
