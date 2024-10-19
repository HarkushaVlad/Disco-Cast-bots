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
