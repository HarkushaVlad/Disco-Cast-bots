export const CREATE_TELEGRAM_KEY_COMMAND = 'createkey';
export const CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP = 'createKeyGetGroupIdStep';
export const CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP =
  'createKeyAddDescriptionStep';

export const SHOW_TELEGRAMS_KEYS_COMMAND = 'showkeys';

export const ALL_TELEGRAM_COMMANDS = [
  CREATE_TELEGRAM_KEY_COMMAND,
  SHOW_TELEGRAMS_KEYS_COMMAND,
] as const;

export const PAGE_CALLBACK_QUERY_DATA = 'page';
export const KEY_CALLBACK_QUERY_DATA = 'key';
export const DELETE_CALLBACK_QUERY_DATA = 'delete';
