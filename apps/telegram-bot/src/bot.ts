import { Context, Telegraf } from 'telegraf';
import { config } from '@disco-cast-bot/shared';
import { PostPayload } from '../../../libs/shared/src/types/post.types';
import { TelegramPostService } from './services/telegramPost.service';
import { connectToRabbitMQ } from '../../../libs/shared/src/messaging/rabbitmq';
import {
  CREATE_TELEGRAM_KEY_COMMAND,
  RABBITMQ_POST_QUEUE_NAME,
  SHOW_TELEGRAMS_KEYS_COMMAND,
} from '../../../libs/shared/src/constants/constants';
import { Channel, Connection } from 'amqplib';
import { setupCommands } from './commands';
import { callbackQuery, message } from 'telegraf/filters';
import { getUserSession } from './services/sessionManager';
import { handleCreateKeySteps } from './commands/createKey';
import { handleShowKeysSteps } from './commands/showKeys';

const setupMessageConsumption = (channel: Channel) => {
  channel.consume(RABBITMQ_POST_QUEUE_NAME, async (msg) => {
    if (msg) {
      await processMessage(msg);
    }
  });
};

const processMessage = async (msg: any) => {
  try {
    const post: PostPayload = JSON.parse(msg.content.toString());
    await handlePost(config.telegramChannelId, post);
    channel.ack(msg);
    console.log('Post processed and sent to Telegram');
  } catch (error) {
    console.error('Failed to process message', error);
  }
};

export const handlePost = async (
  telegramChannelId: string,
  post: PostPayload
) => {
  const telegramPostService = new TelegramPostService(
    bot,
    telegramChannelId,
    post
  );
  await telegramPostService.sendPost();
};

const handleUserAction = async (ctx: Context) => {
  const userId = ctx.from.id;
  const session = getUserSession(userId);

  if (!session || !session.command) return;

  switch (session.command) {
    case CREATE_TELEGRAM_KEY_COMMAND:
      handleCreateKeySteps(ctx, session);
      return;
    case SHOW_TELEGRAMS_KEYS_COMMAND:
      handleShowKeysSteps(ctx, session);
      return;
  }
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
  await bot.stop();
  process.exit(0);
};

const bot = new Telegraf(config.telegramBotToken);
let connection: Connection;
let channel: Channel;

export const startBot = async () => {
  try {
    ({ connection, channel } = await connectToRabbitMQ());
    setupMessageConsumption(channel);
    setupCommands(bot);
    bot.on(message(), async (ctx) => handleUserAction(ctx));
    bot.on(callbackQuery(), async (ctx) => handleUserAction(ctx));
    bot.launch();
    console.log('Telegram bot is running');

    process.on('SIGINT', closeConnections);
    process.on('SIGTERM', closeConnections);
  } catch (error) {
    console.error('Failed to start bot', error);
  }
};

export type TgBot = typeof bot;
