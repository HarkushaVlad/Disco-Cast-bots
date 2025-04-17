import { Context, Markup } from 'telegraf';
import { prisma } from '../../../../libs/shared/src/prisma/prismaClient';
import { TelegramKey } from '@prisma/client';
import {
  addUserSessionData,
  clearUserSession,
  getUserSession,
  setUserSession,
  updateUserSession,
  UserSession,
} from '../services/sessionManager';
import {
  AI_QUERY_PAGE_CALLBACK_QUERY_DATA,
  APPLYING_AI_QUERY_TEXT,
  DELETE_AI_QUERY,
  DELETE_CALLBACK_QUERY_DATA,
  KEY_CALLBACK_QUERY_DATA,
  PAGE_CALLBACK_QUERY_DATA,
  SHOW_TELEGRAM_KEYS_COMMAND,
  WAIT_FOR_AI_QUERY_TEXT_STEP,
} from '../constants/telegramConstants';
import { deleteMessageFromDataIfExist } from '../services/telegramMessage.service';
import {
  DISCORD_GUILD_CHANNELS_REDIS_KEY,
  redisService,
} from '../../../../libs/shared/src/caching/redis.service';
import { config } from '@disco-cast-bot/shared';

const KEYS_PER_PAGE = 5;

export const showKeysCommand = async (ctx: Context) => {
  const userId = ctx.from.id;
  const session = await getUserSession(ctx.from.id);

  deleteMessageFromDataIfExist(ctx, session);
  await setUserSession(userId, SHOW_TELEGRAM_KEYS_COMMAND);

  const totalKeys = await getTotalKeys(userId);
  if (totalKeys === 0) {
    ctx.reply('ℹ You do not have any keys.');
    return;
  }

  const userKeys = await getKeysPage(userId);
  await displayKeysPage(ctx, userKeys, 0, totalKeys);
};

const displayKeysPage = async (
  ctx: Context,
  keys: TelegramKey[],
  pageIndex: number,
  totalKeys: number
) => {
  const totalPages = Math.ceil(totalKeys / KEYS_PER_PAGE);

  const keyButtons = createKeyButtons(keys);
  const paginationButtons = createPaginationButtons(pageIndex, totalPages);

  const session = await addUserSessionData(ctx.from.id, { totalKeys });

  const text = `${pageIndex + 1}️⃣|${totalPages}️⃣ - Here are your keys:`;
  const inlineKeyboardMarkup = Markup.inlineKeyboard([
    ...keyButtons,
    paginationButtons,
  ]).reply_markup;

  await updateMessage(ctx, session, text, inlineKeyboardMarkup);
};

const createKeyButtons = (keys: TelegramKey[]) =>
  keys
    .map((key) =>
      Markup.button.callback(
        `🔑 ${key.description}`,
        `${KEY_CALLBACK_QUERY_DATA}_${key.uniqueKey}_${key.description}`
      )
    )
    .map((btn) => [btn]);

const createPaginationButtons = (pageIndex: number, totalPages: number) => {
  const buttons = [];
  if (pageIndex > 0)
    buttons.push(
      Markup.button.callback(
        '⬅',
        `${PAGE_CALLBACK_QUERY_DATA}_${pageIndex - 1}`
      )
    );
  if (pageIndex + 1 < totalPages)
    buttons.push(
      Markup.button.callback(
        '➡',
        `${PAGE_CALLBACK_QUERY_DATA}_${pageIndex + 1}`
      )
    );
  return buttons.length ? buttons : [];
};

const updateMessage = async (
  ctx: Context,
  session: UserSession,
  text: string,
  replyMarkup: any
) => {
  try {
    if ('messageId' in session.data) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        session.data.messageId,
        undefined,
        text,
        {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }
      );
      return;
    }
    const sentMessage = await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
    await updateUserSession(ctx.from.id, {
      data: { ...session.data, messageId: sentMessage.message_id },
    });
  } catch (error) {
    console.error('Error updating message:', error);
  }
};

const handleButtonPress = async (ctx: Context, session: UserSession) => {
  if (!('data' in ctx.callbackQuery)) return;

  const callbackData = ctx.callbackQuery.data;
  if (!callbackData) return;

  const userId = ctx.from.id;

  if (callbackData.startsWith(PAGE_CALLBACK_QUERY_DATA + '_')) {
    const pageIndex = parseInt(callbackData.split('_')[1], 10);
    const totalKeys = session.data.totalKeys || (await getTotalKeys(userId));
    const userKeys = await getKeysPage(userId, pageIndex * KEYS_PER_PAGE);
    await displayKeysPage(ctx, userKeys, pageIndex, totalKeys);
    return;
  }

  if (callbackData.startsWith(KEY_CALLBACK_QUERY_DATA + '_')) {
    await displayKeyDetails(ctx);
    return;
  }

  if (callbackData.startsWith(DELETE_CALLBACK_QUERY_DATA + '_')) {
    await handleKeyDeletion(ctx, callbackData, userId);
    return;
  }

  if (callbackData.startsWith(AI_QUERY_PAGE_CALLBACK_QUERY_DATA + '_')) {
    await handleAiQueryApplying(ctx);
  }

  if (callbackData.startsWith(DELETE_AI_QUERY + '_')) {
    await handleAiQueryDeleting(ctx, callbackData, userId);
  }
};

const handleKeyDeletion = async (
  ctx: Context,
  callbackData: string,
  userId: number
) => {
  const key = callbackData.split('_')[1];
  try {
    const relatedGuildsInLinks = await prisma.channelsLink.findMany({
      where: {
        telegramKey: {
          uniqueKey: key,
        },
      },
      select: {
        discordChannel: {
          select: {
            guild: {
              select: {
                discordGuildId: true,
              },
            },
          },
        },
      },
    });

    await prisma.telegramKey.delete({ where: { uniqueKey: key } });

    const discordGuildIds = [
      ...new Set(
        relatedGuildsInLinks.map(
          (link) =>
            `${DISCORD_GUILD_CHANNELS_REDIS_KEY}:${link.discordChannel.guild.discordGuildId}`
        )
      ),
    ];

    await redisService.delete(...discordGuildIds);

    await ctx.answerCbQuery('✅ Key successfully deleted.');

    const totalKeys = await getTotalKeys(userId);
    if (totalKeys === 0) {
      await ctx.editMessageText('ℹ You do not have any keys.', {
        parse_mode: 'HTML',
      });
      return;
    }

    const userKeys = await getKeysPage(userId);
    await displayKeysPage(ctx, userKeys, 0, totalKeys);
  } catch (error) {
    console.error('Error deleting key:', error);
    await ctx.answerCbQuery(
      '❌ Failed to delete the key. Please try again later.'
    );
  }
};

const displayKeyDetails = async (ctx: Context) => {
  if (!('data' in ctx.callbackQuery)) return;

  const data = ctx.callbackQuery.data.split('_');
  if (!data || data.length < 3) return;

  const [, key, description] = data;
  const text = `🔑 <code>${key}</code>\n🗒 Description: <i>${description}</i>`;

  const defaultUserKeyboardMarkup = [
    Markup.button.callback('⬅', `${PAGE_CALLBACK_QUERY_DATA}_${0}`),
    Markup.button.callback('🗑', `${DELETE_CALLBACK_QUERY_DATA}_${key}`),
  ];

  const aiWhitelistUserKeyboardMarkup = [
    Markup.button.callback('⬅', `${PAGE_CALLBACK_QUERY_DATA}_${0}`),
    Markup.button.callback(`🤖`, `${AI_QUERY_PAGE_CALLBACK_QUERY_DATA}_${key}`),
    Markup.button.callback('🗑', `${DELETE_CALLBACK_QUERY_DATA}_${key}`),
  ];

  const inlineKeyboardMarkup = Markup.inlineKeyboard(
    config.aiWhitelist.includes(ctx.from.username)
      ? aiWhitelistUserKeyboardMarkup
      : defaultUserKeyboardMarkup
  ).reply_markup;

  await updateMessage(
    ctx,
    await getUserSession(ctx.from.id),
    text,
    inlineKeyboardMarkup
  );
};

const handleAiQueryApplying = async (ctx: Context) => {
  if (!('data' in ctx.callbackQuery)) return;

  const data = ctx.callbackQuery.data.split('_');
  if (!data || data.length !== 2) return;

  const [, key] = data;

  const keyWithExistingAiQuery = await prisma.telegramKey.findUnique({
    where: {
      uniqueKey: key,
      aiQuery: {
        not: {
          equals: '',
        },
      },
      owner: {
        userId: ctx.from.id,
      },
    },
  });

  if (keyWithExistingAiQuery) {
    await showAiQueryEditPage(
      ctx,
      keyWithExistingAiQuery.uniqueKey,
      keyWithExistingAiQuery.aiQuery
    );
  } else {
    await updateMessage(
      ctx,
      await getUserSession(ctx.from.id),
      'Please write your query, and AI will process it and handle all incoming messages from Discord accordingly.',
      null
    );
    await setUserSession(
      ctx.from.id,
      APPLYING_AI_QUERY_TEXT,
      WAIT_FOR_AI_QUERY_TEXT_STEP,
      {
        key,
      }
    );
  }
};

const showAiQueryEditPage = async (
  ctx: Context,
  telegramKey: string,
  aiQuery: string
) => {
  const session = await getUserSession(ctx.from.id);

  await ctx.telegram.editMessageText(
    ctx.chat.id,
    session.data.messageId,
    undefined,
    `AI Query:\n${aiQuery}`,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('⬅', `${PAGE_CALLBACK_QUERY_DATA}_${0}`),
        Markup.button.callback('🗑 Clear', `${DELETE_AI_QUERY}_${telegramKey}`),
      ]).reply_markup,
    }
  );
};

export const handleAiQueryText = async (ctx: Context, session: UserSession) => {
  switch (session.step) {
    case WAIT_FOR_AI_QUERY_TEXT_STEP:
      if (
        ('text' in ctx.message &&
          ctx.message.text.toLowerCase() === 'cancel') ||
        !session.data.key
      ) {
        await clearUserSession(ctx.from.id);
        await showKeysCommand(ctx);
        return;
      }

      if (
        !('text' in ctx.message) ||
        ctx.message.text.length < 10 ||
        ctx.message.text.length > 200
      ) {
        ctx.reply(
          '❌ Please provide a query text for AI between 10 and 200 characters, or type `cancel` to exit.'
        );
      } else {
        await prisma.telegramKey.update({
          where: {
            uniqueKey: session.data.key,
            owner: {
              userId: ctx.from.id,
            },
          },
          data: {
            aiQuery: ctx.message.text,
          },
        });

        await clearUserSession(ctx.from.id);

        const relatedGuildsInLinks = await prisma.channelsLink.findMany({
          where: {
            telegramKey: {
              uniqueKey: session.data.key,
            },
          },
          select: {
            discordChannel: {
              select: {
                guild: {
                  select: {
                    discordGuildId: true,
                  },
                },
              },
            },
          },
        });

        const discordGuildIds = [
          ...new Set(
            relatedGuildsInLinks.map(
              (link) =>
                `${DISCORD_GUILD_CHANNELS_REDIS_KEY}:${link.discordChannel.guild.discordGuildId}`
            )
          ),
        ];

        await redisService.delete(...discordGuildIds);

        ctx.reply('✅ Query for AI has been successfully added.');

        await showKeysCommand(ctx);
      }
  }
};

const handleAiQueryDeleting = async (
  ctx: Context,
  callbackData: string,
  userId: number
) => {
  await prisma.telegramKey.update({
    where: {
      uniqueKey: callbackData.split('_')[1],
      owner: {
        userId,
      },
    },
    data: {
      aiQuery: '',
    },
  });

  ctx.reply('✅ AI query has been successfully cleared.');

  await showKeysCommand(ctx);
};

const getKeysPage = async (userId: number, skip = 0) =>
  prisma.telegramKey.findMany({
    where: {
      owner: {
        userId,
      },
    },
    skip,
    take: KEYS_PER_PAGE,
    orderBy: { description: 'asc' },
  });

const getTotalKeys = async (userId: number) =>
  prisma.telegramKey.count({
    where: {
      owner: {
        userId,
      },
    },
  });

export const handleShowKeysSteps = async (
  ctx: Context,
  session: UserSession
) => {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery)
    await handleButtonPress(ctx, session);
};
