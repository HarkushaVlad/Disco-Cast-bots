import { Post } from '../types/post.types';
import { config } from '@sot-news-bot/shared';

export const channelTypeMap = new Map<string, Post>();
channelTypeMap.set(config.discordAnnouncementChannelId!, 'announcement');
channelTypeMap.set(config.discordReleaseNotesChannelId!, 'releaseNotes');
channelTypeMap.set(config.discordGameUpdatesChannelId!, 'gameUpdates');
channelTypeMap.set(config.discordLiveEventsChannelId!, 'liveEvents');
