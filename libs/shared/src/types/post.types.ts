export type Post =
  | '#announcement'
  | '#releasenotes'
  | '#gameupdates'
  | '#liveevents'
  | '#other';

export type MediaType = 'photo' | 'video' | 'animation' | 'document';

export type Medias = Record<MediaType, string[]>;

export interface PostPayload {
  text: string;
  medias: Medias;
  messageUrl: string;
  channelType: Post;
}
