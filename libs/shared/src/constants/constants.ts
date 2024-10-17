import { MediaType, Post } from '../types/post.types';
import { config } from '@sot-news-bot/shared';

export const channelTypeMap = new Map<string, Post>();
channelTypeMap.set(config.discordAnnouncementChannelId!, '#announcement');
channelTypeMap.set(config.discordReleaseNotesChannelId!, '#releasenotes');
channelTypeMap.set(config.discordGameUpdatesChannelId!, '#gameupdates');
channelTypeMap.set(config.discordLiveEventsChannelId!, '#liveevents');

export const SEND_ORDER_MEDIAS: MediaType[] = [
  'animation',
  'video',
  'photo',
  'document',
];

export const MAX_CHARACTERS_TG_TEXT = 4096;
export const MAX_CHARACTERS_TG_CAPTION = 1024;
