import { Context, Markup } from 'telegraf';
import {
  clearUserSession,
  getUserSession,
  setUserSession,
  updateUserSession,
  UserSession,
} from '../services/sessionManager';

import { randomBytes } from 'crypto';
import { prisma } from '../services/prismaClient';
import { getOrCreateTelegramUser } from '../services/telegramUser.service';
import {
  CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP,
  CREATE_TELEGRAM_KEY_COMMAND,
  CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP,
  TELEGRAM_INTERACTION_KEYBOARD_MARKUP,
} from '../constants/constants';
import { deleteMessageFromDataIfExist } from '../services/telegramMessage.service';

export const startCommand = async (ctx: Context) => {
  ctx.reply('Halo', {
    reply_markup: TELEGRAM_INTERACTION_KEYBOARD_MARKUP,
  });
};
