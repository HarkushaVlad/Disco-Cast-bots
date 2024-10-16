import { Telegraf } from 'telegraf';
import { config } from '@sot-news-bot/shared';

const bot = new Telegraf(config.telegramBotToken);

export const startBot = () => {
  bot.launch();
  console.log('Telegram bot is running');
};

export const sendMessage = async (text: string) => {
  try {
    await bot.telegram.sendMessage(config.telegramChannelId, text, {
      parse_mode: 'HTML',
    });
    console.log('Post was successfully posted');
  } catch (error) {
    console.error('Error posting post:', error);
    throw error;
  }
};
