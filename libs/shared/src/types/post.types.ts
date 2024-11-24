import { DiscordChannel } from '@prisma/client';

export type MediaType = 'photo' | 'video' | 'animation' | 'document';

export type Medias = Record<MediaType, string[]>;

export interface PostPayload {
  text: string;
  medias: Medias;
  messageUrl: string;
  channelType: string;
  discordChannel: DiscordChannel;
}
