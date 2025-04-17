import { ALL_TELEGRAM_ACTIONS } from '../constants/telegramConstants';

export type TelegramAction = (typeof ALL_TELEGRAM_ACTIONS)[number];
