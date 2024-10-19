import { Telegraf } from 'telegraf';
import { config } from '@disco-cast-bot/shared';
import { PostPayload } from '../../../libs/shared/src/types/post.types';
import { TelegramPostService } from './services/telegramPost.service';
import { connectToRabbitMQ } from '../../../libs/shared/src/messaging/rabbitmq';
import { RABBITMQ_POST_QUEUE_NAME } from '../../../libs/shared/src/constants/constants';
import { Channel, Connection } from 'amqplib';

const bot = new Telegraf(config.telegramBotToken);

let connection: Connection;
let channel: Channel;

export const startBot = async () => {
  try {
    bot.launch();
    console.log('Telegram bot is running');

    ({ connection, channel } = await connectToRabbitMQ());

    channel.consume(RABBITMQ_POST_QUEUE_NAME, async (msg) => {
      if (msg) {
        try {
          const post: PostPayload = JSON.parse(msg.content.toString());
          await handlePost(config.telegramChannelId, post);
          channel.ack(msg);
          console.log('Post processed and sent to Telegram');
        } catch (error) {
          console.error('Failed to process message', error);
        }
      }
    });

    process.on('SIGINT', closeConnections);
    process.on('SIGTERM', closeConnections);
  } catch (error) {
    console.error('Failed to connect to RabbitMQ', error);
  }
};

export const handlePost = async (
  telegramChannelId: string,
  post: PostPayload
) => {
  const telegramPostService: TelegramPostService = new TelegramPostService(
    bot,
    telegramChannelId,
    post
  );
  await telegramPostService.sendPost();
};

const closeConnections = async () => {
  console.log('Closing RabbitMQ connection...');
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
  console.log('RabbitMQ connection closed. Stopping Telegram bot...');
  await bot.stop(); // Зупиняємо Telegram-бота
  process.exit(0); // Завершуємо процес
};

export type TgBot = typeof bot;
