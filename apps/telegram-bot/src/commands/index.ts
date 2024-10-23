import { Telegraf } from 'telegraf';
import { createKeyCommand } from './createKey';
import { CREATE_TELEGRAM_KEY_COMMAND } from '../../../../libs/shared/src/constants/constants';

export const setupCommands = (bot: Telegraf) => {
  bot.command(CREATE_TELEGRAM_KEY_COMMAND, createKeyCommand);
};
