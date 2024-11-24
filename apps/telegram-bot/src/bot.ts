import { Context, Telegraf } from 'telegraf';
import { config } from '@disco-cast-bot/shared';
import { PostPayload } from '../../../libs/shared/src/types/post.types';
import { TelegramPostService } from './services/telegramPost.service';
import { connectToRabbitMQ } from '../../../libs/shared/src/messaging/rabbitmq';
import { Channel, Connection } from 'amqplib';
import { setupCommands } from './commands';
import { callbackQuery, message } from 'telegraf/filters';
import { getUserSession } from './services/sessionManager';
import { createKeyCommand, handleCreateKeySteps } from './commands/createKey';
import { handleShowKeysSteps, showKeysCommand } from './commands/showKeys';
import { RABBITMQ_POST_QUEUE_NAME } from '../../../libs/shared/src/constants/constants';
import {
  ALL_TELEGRAM_COMMANDS,
  CREATE_TELEGRAM_KEY_BUTTON_COMMAND,
  CREATE_TELEGRAM_KEY_COMMAND,
  SHOW_TELEGRAM_KEYS_BUTTON_COMMAND,
  SHOW_TELEGRAM_KEYS_COMMAND,
} from './constants/telegramConstants';
import { prisma } from './services/prismaClient';
import {
  DISCORD_CHANNEL_WITH_TG_IDS_REDIS_KEY,
  redisService,
} from '../../../libs/shared/src/caching/redis.service';
import { DiscordChannelWithTelegramChannelIds } from '../../../libs/shared/src/types/channel.type';
import { safeJSONStringify } from '../../../libs/shared/src/utils/utils';

let connection: Connection;
let channel: Channel;
const bot = new Telegraf(config.telegramBotToken);
const telegramPostService = new TelegramPostService(bot);

const setupMessageConsumption = (channel: Channel) => {
  channel.consume(RABBITMQ_POST_QUEUE_NAME, async (msg) => {
    if (msg) {
      try {
        const post: PostPayload = JSON.parse(msg.content.toString());
        await handlePostToTelegram(post);
        channel.ack(msg);
      } catch (error) {
        console.error('Failed to process message:', error);
      }
    }
  });
};

const handlePostToTelegram = async (post: PostPayload) => {
  try {
    const cacheKey = `${DISCORD_CHANNEL_WITH_TG_IDS_REDIS_KEY}:${post.discordChannel.discordChannelId}`;
    const existingDiscordChannel = await redisService.get(cacheKey);
    let discordChannelRecord: DiscordChannelWithTelegramChannelIds;

    if (!existingDiscordChannel) {
      discordChannelRecord = await prisma.discordChannel.findUnique({
        where: { id: post.discordChannel.id },
        include: {
          uniqueKeys: {
            select: {
              telegramChannelId: true,
            },
          },
        },
      });

      if (discordChannelRecord) {
        await redisService.set(
          cacheKey,
          safeJSONStringify(discordChannelRecord),
          60 * 60
        );
      }
    } else {
      discordChannelRecord = JSON.parse(existingDiscordChannel);
    }

    if (!discordChannelRecord || !discordChannelRecord.uniqueKeys.length) {
      console.error('No Telegram channel IDs from Discord connection');
      return;
    }

    const telegramChannelIds = discordChannelRecord.uniqueKeys.map(
      (key) => key.telegramChannelId
    );
    await telegramPostService.sendPost(post, telegramChannelIds);
  } catch (error) {
    console.error('Failed to send post to Telegram:', error);
  }
};

const handleUserAction = async (ctx: Context) => {
  if (
    ctx.message &&
    'text' in ctx.message &&
    ALL_TELEGRAM_COMMANDS.includes(ctx.message.text)
  ) {
    await handleButtonCommand(ctx);
    return;
  }

  const userId = ctx.from.id;
  const session = getUserSession(userId);

  if (!session || !session.command) return;

  await handleSessionSteps(ctx, session);
};

const handleButtonCommand = async (ctx: Context) => {
  if ('text' in ctx.message) {
    switch (ctx.message.text) {
      case CREATE_TELEGRAM_KEY_BUTTON_COMMAND:
        await createKeyCommand(ctx);
        return;
      case SHOW_TELEGRAM_KEYS_BUTTON_COMMAND:
        await showKeysCommand(ctx);
        return;
    }
  }
};

const handleSessionSteps = async (ctx: Context, session: any) => {
  switch (session.command) {
    case CREATE_TELEGRAM_KEY_COMMAND:
      return handleCreateKeySteps(ctx, session);
    case SHOW_TELEGRAM_KEYS_COMMAND:
      return handleShowKeysSteps(ctx, session);
  }
};

const closeConnections = async () => {
  console.log('Closing RabbitMQ connection...');
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed.');
  } catch (error) {
    console.error('Error while closing RabbitMQ connections:', error);
  }

  console.log('Flush all keys in Redis...');
  await redisService.flush();

  console.log('Stopping Telegram bot...');
  bot.stop();
  process.exit(0);
};

export const startBot = async () => {
  try {
    ({ connection, channel } = await connectToRabbitMQ());
    setupMessageConsumption(channel);
    setupCommands(bot);

    bot.on(message(), async (ctx) => handleUserAction(ctx));
    bot.on(callbackQuery(), async (ctx) => handleUserAction(ctx));

    bot.launch();
    console.log('Telegram bot is running\n');
  } catch (error) {
    console.error('Failed to start Telegram bot:', error);
    process.exit(1);
  }

  process.on('SIGINT', closeConnections);
  process.on('SIGTERM', closeConnections);
};

export type TgBot = typeof bot;
