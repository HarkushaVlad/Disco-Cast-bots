import 'dotenv/config';
import * as process from 'node:process';

export const config = {
  discordBotToken: process.env['DISCORD_BOT_TOKEN'],
  telegramBotToken: process.env['TELEGRAM_BOT_TOKEN'],
  telegramChannelId: process.env['TELEGRAM_CHANNEL_ID'],
  telegramServerPort: process.env['TELEGRAM_SERVER_PORT'],
  rabbitMQUrl: process.env['RABBITMQ_URL'],
  discordAnnouncementChannelId: process.env['DISCORD_ANNOUNCEMENT_CHANNEL_ID'],
  discordReleaseNotesChannelId: process.env['DISCORD_RELEASE_NOTES_CHANNEL_ID'],
  discordGameUpdatesChannelId: process.env['DISCORD_GAME_UPDATES_CHANNEL_ID'],
  discordLiveEventsChannelId: process.env['DISCORD_LIVE_EVENTS_CHANNEL_ID'],
};
