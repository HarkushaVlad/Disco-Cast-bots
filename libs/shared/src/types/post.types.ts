import { ChannelsLinkPayload } from './channel.type';

export type MediaType = 'photo' | 'video' | 'animation' | 'document';

export type Medias = Record<MediaType, string[]>;

export interface PostPayload {
  text: string;
  medias: Medias;
  messageUrl: string;
  channelsLink: ChannelsLinkPayload;
}
