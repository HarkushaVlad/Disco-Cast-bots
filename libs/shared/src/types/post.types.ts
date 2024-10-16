export type Post =
  | 'announcement'
  | 'releaseNotes'
  | 'gameUpdates'
  | 'liveEvents'
  | 'other';

export interface PostPayload {
  text: string;
  media: string[];
  postType: Post;
}
