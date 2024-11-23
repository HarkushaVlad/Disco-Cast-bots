import { Telegraf } from 'telegraf';
import { createKeyCommand } from './createKey';
import { showKeysCommand } from './showKeys';
import {
  CREATE_TELEGRAM_KEY_COMMAND,
  SHOW_TELEGRAM_KEYS_COMMAND,
  START_TELEGRAM_COMMAND,
} from '../constants/telegramConstants';
import { startCommand } from './start';

export const setupCommands = (bot: Telegraf) => {
  bot.command(START_TELEGRAM_COMMAND, startCommand);
  bot.command(CREATE_TELEGRAM_KEY_COMMAND, createKeyCommand);
  bot.command(SHOW_TELEGRAM_KEYS_COMMAND, showKeysCommand);
};
