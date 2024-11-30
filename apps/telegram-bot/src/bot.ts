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
  DISCORD_GUILD_CHANNELS_REDIS_KEY,
  redisService,
} from '../../../libs/shared/src/caching/redis.service';
import { ChannelsLinkPayload } from '../../../libs/shared/src/types/channel.type';
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
    const discordGuildId =
      post.channelsLink.discordChannel.guild.discordGuildId;
    const cacheKey = `${DISCORD_GUILD_CHANNELS_REDIS_KEY}:${discordGuildId}`;
    const existingDiscordChannelsRecords = await redisService.get(cacheKey);
    let cachedLinks: ChannelsLinkPayload[];

    if (existingDiscordChannelsRecords) {
      cachedLinks = JSON.parse(existingDiscordChannelsRecords);
    } else {
      cachedLinks = await prisma.channelsLink.findMany({
        where: {
          discordChannel: {
            guild: {
              discordGuildId,
            },
          },
        },
        include: {
          discordChannel: {
            include: {
              guild: true,
            },
          },
          telegramKey: true,
        },
      });

      await redisService.set(cacheKey, safeJSONStringify(cachedLinks), 60 * 60);
    }

    const linksForSpecificDiscordChannel = cachedLinks.filter(
      (link) =>
        link.discordChannelRecordId === post.channelsLink.discordChannelRecordId
    );

    if (
      !linksForSpecificDiscordChannel ||
      !linksForSpecificDiscordChannel.length
    ) {
      console.error('No links found for the Discord channel');
      return;
    }

    const telegramChannelIds = linksForSpecificDiscordChannel.map(
      (key) => key.telegramKey.telegramChannelId
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
  const session = await getUserSession(userId);

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

export const startBot = async () => {
  try {
    ({ connection, channel } = await connectToRabbitMQ());
    setupMessageConsumption(channel);

    console.log('Flush all keys in Redis on start...');
    await redisService.flush();

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

export type TgBot = typeof bot;
