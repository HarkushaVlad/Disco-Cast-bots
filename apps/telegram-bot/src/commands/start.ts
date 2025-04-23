import { Context } from 'telegraf';
import { TELEGRAM_INTERACTION_KEYBOARD_MARKUP } from '../constants/telegramConstants';
import { getOrCreateTelegramUser } from '../services/telegramUser.service';
import { showKeysCommand } from './showKeys';

export const startCommand = async (ctx: Context) => {
  await getOrCreateTelegramUser(ctx);
  await showKeysCommand(ctx);
};
