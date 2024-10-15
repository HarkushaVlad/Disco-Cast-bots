import { Router } from 'express';
import { sendMessage } from '../bot';
import { PostPayload } from '../../../../libs/shared/src/types/post.types';

const router = Router();

router.post('/send-message', async (req, res) => {
  const post: PostPayload = req.body;

  if (post) {
    try {
      await sendMessage(post.text);
      res.status(200).send('Post was successfully posted');
    } catch (error) {
      res.status(500).send('Failed posting');
    }
  } else {
    res.status(400).send('Missing post');
  }
});

export default router;
