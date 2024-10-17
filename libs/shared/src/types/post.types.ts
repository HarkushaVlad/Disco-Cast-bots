export type Post =
  | 'announcement'
  | 'releaseNotes'
  | 'gameUpdates'
  | 'liveEvents'
  | 'other';

export type MediaType = 'photo' | 'video' | 'animation' | 'document';

export type Medias = Record<MediaType, string[]>;

export interface PostPayload {
  text: string;
  medias: Medias;
  channelType: Post;
}
