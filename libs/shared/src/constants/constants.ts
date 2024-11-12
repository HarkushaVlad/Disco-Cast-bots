import { MediaType } from '../types/post.types';

export const SEND_ORDER_MEDIAS: MediaType[] = [
  'animation',
  'video',
  'photo',
  'document',
];

export const MAX_CHARACTERS_TG_TEXT = 4096;
export const MAX_CHARACTERS_TG_CAPTION = 1024;

export const RABBITMQ_POST_QUEUE_NAME = 'telegramPosts';

export const CREATE_TELEGRAM_KEY_COMMAND = 'createkey';
export const CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP = 'createKeyGetGroupIdStep';
export const CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP =
  'createKeyAddDescriptionStep';

export const ALL_TELEGRAM_COMMANDS = [CREATE_TELEGRAM_KEY_COMMAND] as const;
