import { Context } from 'telegraf';
import { TELEGRAM_INTERACTION_KEYBOARD_MARKUP } from '../constants/telegramConstants';

export const startCommand = async (ctx: Context) => {
  ctx.reply('Halo', {
    reply_markup: TELEGRAM_INTERACTION_KEYBOARD_MARKUP,
  });
};
