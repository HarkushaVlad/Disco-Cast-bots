import { Router } from 'express';
import { handlePost } from '../bot';
import { PostPayload } from '../../../../libs/shared/src/types/post.types';
import { config } from '@disco-cast-bot/shared';

const router = Router();

router.post('/send-message', async (req, res) => {
  const post: PostPayload = req.body;

  if (post) {
    try {
      await handlePost(config.telegramChannelId, post);
      res.status(200).send('Post was successfully posted');
    } catch (error) {
      res.status(500).send('Failed posting');
    }
  } else {
    res.status(400).send('Missing post');
  }
});

export default router;
