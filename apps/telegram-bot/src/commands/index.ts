import { Telegraf } from 'telegraf';
import { createKeyCommand } from './createKey';
import { showKeysCommand } from './showKeys';
import {
  CREATE_TELEGRAM_KEY_COMMAND,
  SHOW_TELEGRAMS_KEYS_COMMAND,
} from '../constants/constants';

export const setupCommands = (bot: Telegraf) => {
  bot.command(CREATE_TELEGRAM_KEY_COMMAND, createKeyCommand);
  bot.command(SHOW_TELEGRAMS_KEYS_COMMAND, showKeysCommand);
};
