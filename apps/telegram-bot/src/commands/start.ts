import { Context } from 'telegraf';
import { TELEGRAM_INTERACTION_KEYBOARD_MARKUP } from '../constants/telegramConstants';
import { getOrCreateTelegramUser } from '../services/telegramUser.service';

export const startCommand = async (ctx: Context) => {
  await getOrCreateTelegramUser(ctx);
  ctx.reply('Halo', {
    reply_markup: TELEGRAM_INTERACTION_KEYBOARD_MARKUP,
  });
};
