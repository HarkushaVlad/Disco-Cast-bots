import { Context, Telegraf } from 'telegraf';
import { config } from '@disco-cast-bot/shared';
import { PostPayload } from '../../../libs/shared/src/types/post.types';
import { TelegramPostService } from './services/telegramPost.service';
import { connectToRabbitMQ } from '../../../libs/shared/src/messaging/rabbitmq';
import { Channel, ChannelModel } from 'amqplib';
import { setupCommands } from './commands';
import { callbackQuery, message } from 'telegraf/filters';
import { getUserSession, UserSession } from './services/sessionManager';
import {
  createKeyCommand,
  handleCreateKeySteps,
  revokeExistingTelegramKey,
} from './commands/createKey';
import {
  handleAiQueryText,
  handleShowKeysSteps,
  showKeysCommand,
} from './commands/showKeys';
import { RABBITMQ_POST_QUEUE_NAME } from '../../../libs/shared/src/constants/constants';
import {
  ALL_TELEGRAM_COMMANDS,
  APPLYING_AI_QUERY_TEXT,
  CREATE_TELEGRAM_KEY_BUTTON_COMMAND,
  CREATE_TELEGRAM_KEY_COMMAND,
  REVOKE_CALLBACK_QUERY_DATA,
  SHOW_TELEGRAM_KEYS_BUTTON_COMMAND,
  SHOW_TELEGRAM_KEYS_COMMAND,
} from './constants/telegramConstants';
import { prisma } from '../../../libs/shared/src/prisma/prismaClient';
import {
  DISCORD_GUILD_CHANNELS_REDIS_KEY,
  redisService,
} from '../../../libs/shared/src/caching/redis.service';
import {
  ChannelsLinkPayload,
  TelegramChannelForPost,
} from '../../../libs/shared/src/types/channel.type';
import { safeJSONStringify } from '../../../libs/shared/src/utils/utils';
import { AiRequestService } from '../../../libs/shared/src/services/aiRequest.service';

let rabbitChannelModel: ChannelModel;
let rabbitChannel: Channel;
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

    const noAiChannels: TelegramChannelForPost[] = [];
    const aiChannelsPromises: Promise<TelegramChannelForPost>[] = [];

    const aiRequestService = new AiRequestService(
      config.aiApiUrl,
      config.aiConfigText
    );

    linksForSpecificDiscordChannel.forEach((link) => {
      if (link.telegramKey.aiQuery) {
        const promise = aiRequestService
          .execRequest(post.text, link.telegramKey.aiQuery)
          .then((aiText) => ({
            telegramChannelId: link.telegramKey.telegramChannelId,
            aiText,
          }));

        aiChannelsPromises.push(promise);
      } else {
        noAiChannels.push({
          telegramChannelId: link.telegramKey.telegramChannelId,
          aiText: null,
        });
      }
    });

    if (noAiChannels.length > 0) {
      await telegramPostService.sendPost(post, noAiChannels);
      console.log(
        `Sent posts to ${noAiChannels.length} channels without AI processing`
      );
    }

    if (aiChannelsPromises.length > 0) {
      const aiChannels = await Promise.all(aiChannelsPromises);
      await telegramPostService.sendPost(post, aiChannels);
      console.log(
        `Sent posts to ${aiChannels.length} channels with AI processing`
      );
    }
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

  if (!session || !session.interaction) {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await handleCallbackQuery(ctx);
    }
    return;
  }

  await handleSessionSteps(ctx, session);
};

const handleButtonCommand = async (ctx: Context) => {
  if ('text' in ctx.message) {
    switch (ctx.message.text) {
      case CREATE_TELEGRAM_KEY_BUTTON_COMMAND:
        await createKeyCommand(ctx);
        break;
      case SHOW_TELEGRAM_KEYS_BUTTON_COMMAND:
        await showKeysCommand(ctx);
        break;
    }
  }
};

const handleSessionSteps = async (ctx: Context, session: UserSession) => {
  switch (session.interaction) {
    case CREATE_TELEGRAM_KEY_COMMAND:
      await handleCreateKeySteps(ctx, session);
      break;
    case SHOW_TELEGRAM_KEYS_COMMAND:
      await handleShowKeysSteps(ctx, session);
      break;
    case APPLYING_AI_QUERY_TEXT:
      await handleAiQueryText(ctx, session);
      break;
  }
};

const handleCallbackQuery = async (ctx: Context) => {
  if (!('data' in ctx.callbackQuery)) return;
  switch (ctx.callbackQuery.data.split('_')[0]) {
    case REVOKE_CALLBACK_QUERY_DATA:
      await revokeExistingTelegramKey(ctx);
      break;
  }
};

export const startBot = async () => {
  try {
    ({ channelModel: rabbitChannelModel, channel: rabbitChannel } =
      await connectToRabbitMQ());
    setupMessageConsumption(rabbitChannel);

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
    if (rabbitChannel) await rabbitChannel.close();
    if (rabbitChannelModel) await rabbitChannelModel.close();
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
