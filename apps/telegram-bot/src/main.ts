import express from 'express';
import 'dotenv/config';
import { startBot } from './bot';
import postRoutes from './routes/post.routes';
import { config } from '@sot-news-bot/shared';

const app = express();
app.use(express.json());

app.use(postRoutes);

const PORT = config.telegramServerPort;

app.listen(PORT, () => {
  console.log(`Telegram bot server is running on port ${PORT}\n`);
});

startBot();
