import { Telegraf } from 'telegraf';
import { config } from '@disco-cast-bot/shared';
import { PostPayload } from '../../../libs/shared/src/types/post.types';
import { TelegramPostService } from './services/telegramPost.service';

const bot = new Telegraf(config.telegramBotToken);

export const startBot = () => {
  bot.launch();
  console.log('Telegram bot is running');
};

export const handlePost = async (
  telegramChannelId: string,
  post: PostPayload
) => {
  const telegramPostService: TelegramPostService = new TelegramPostService(
    bot,
    telegramChannelId,
    post
  );
  await telegramPostService.sendPost();
};

export type TgBot = typeof bot;
