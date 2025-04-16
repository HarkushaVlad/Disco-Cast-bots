import { ALL_TELEGRAM_COMMANDS } from '../constants/telegramConstants';

export type TelegramCommand = (typeof ALL_TELEGRAM_COMMANDS)[number];
