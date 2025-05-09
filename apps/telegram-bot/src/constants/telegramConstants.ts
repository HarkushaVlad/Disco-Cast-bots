import { Markup } from 'telegraf';

export const MAX_KEYS_PER_USER = 10;

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
];

export const PAGE_CALLBACK_QUERY_DATA = 'page';
export const KEY_CALLBACK_QUERY_DATA = 'key';
export const DELETE_CALLBACK_QUERY_DATA = 'delete';
export const REVOKE_CALLBACK_QUERY_DATA = 'revoke';
export const AI_QUERY_PAGE_CALLBACK_QUERY_DATA = 'aiquerypage';
export const DELETE_AI_QUERY = 'deleteaiquery';

export const APPLYING_AI_QUERY_TEXT = 'applyingAiQueryText';
export const WAIT_FOR_AI_QUERY_TEXT_STEP = 'waitAiQueryTextStep';

export const ALL_TELEGRAM_ACTIONS = [APPLYING_AI_QUERY_TEXT];

export const TELEGRAM_INTERACTION_KEYBOARD_MARKUP = Markup.keyboard([
  [CREATE_TELEGRAM_KEY_BUTTON_COMMAND, SHOW_TELEGRAM_KEYS_BUTTON_COMMAND],
]).resize().reply_markup;

export const TELEGRAM_SESSION_REDIS_ID = 'telegram_session';
