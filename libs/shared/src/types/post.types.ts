export type Post =
  | 'announcement'
  | 'releaseNotes'
  | 'gameUpdates'
  | 'liveEvents';

export interface PostPayload {
  text: string;
  media: string[];
  postType: Post;
}
