import { Telegraf } from 'telegraf';
import { createKeyCommand } from './createKey';
import {
  CREATE_TELEGRAM_KEY_COMMAND,
  SHOW_TELEGRAMS_KEYS_COMMAND,
} from '../../../../libs/shared/src/constants/constants';
import { showKeysCommand } from './showKeys';

export const setupCommands = (bot: Telegraf) => {
  bot.command(CREATE_TELEGRAM_KEY_COMMAND, createKeyCommand);
  bot.command(SHOW_TELEGRAMS_KEYS_COMMAND, showKeysCommand);
};
