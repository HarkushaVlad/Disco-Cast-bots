import { Markup } from 'telegraf';

export const START_TELEGRAM_COMMAND = 'start';

export const CREATE_TELEGRAM_KEY_COMMAND = 'createkey';
export const CREATE_TELEGRAM_KEY_BUTTON_COMMAND = 'Create key';
export const CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP = 'createKeyGetGroupIdStep';
export const CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP =
  'createKeyAddDescriptionStep';

export const SHOW_TELEGRAM_KEYS_COMMAND = 'showkeys';
export const SHOW_TELEGRAM_KEYS_BUTTON_COMMAND = 'Show keys';

export const ALL_TELEGRAM_COMMANDS = [
  CREATE_TELEGRAM_KEY_COMMAND,
  SHOW_TELEGRAM_KEYS_COMMAND,
] as const;

export const PAGE_CALLBACK_QUERY_DATA = 'page';
export const KEY_CALLBACK_QUERY_DATA = 'key';
export const DELETE_CALLBACK_QUERY_DATA = 'delete';

export const TELEGRAM_INTERACTION_KEYBOARD_MARKUP = Markup.keyboard([
  [CREATE_TELEGRAM_KEY_BUTTON_COMMAND, SHOW_TELEGRAM_KEYS_BUTTON_COMMAND],
]).resize().reply_markup;
