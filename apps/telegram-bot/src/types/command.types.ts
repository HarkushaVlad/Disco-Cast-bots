import { ALL_TELEGRAM_COMMANDS } from '../constants/constants';

export type TelegramCommand = (typeof ALL_TELEGRAM_COMMANDS)[number];
