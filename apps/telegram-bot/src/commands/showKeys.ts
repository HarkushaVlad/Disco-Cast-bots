import { Context, Markup } from 'telegraf';
import { prisma } from '../services/prismaClient';
import { TelegramKey } from '@prisma/client';
import {
  addUserSessionData,
  getUserSession,
  setUserSession,
  updateUserSession,
  UserSession,
} from '../services/sessionManager';
import {
  DELETE_CALLBACK_QUERY_DATA,
  KEY_CALLBACK_QUERY_DATA,
  PAGE_CALLBACK_QUERY_DATA,
  SHOW_TELEGRAM_KEYS_COMMAND,
} from '../constants/telegramConstants';
import { deleteMessageFromDataIfExist } from '../services/telegramMessage.service';
import {
  DISCORD_GUILD_CHANNELS_REDIS_KEY,
  redisService,
} from '../../../../libs/shared/src/caching/redis.service';

const KEYS_PER_PAGE = 5;

export const showKeysCommand = async (ctx: Context) => {
  const ownerId = ctx.from.id;
  const session = await getUserSession(ctx.from.id);

  deleteMessageFromDataIfExist(ctx, session);
  await setUserSession(ownerId, SHOW_TELEGRAM_KEYS_COMMAND);

  const totalKeys = await getTotalKeys(ownerId);
  if (totalKeys === 0) {
    ctx.reply('ℹ You do not have any keys.');
    return;
  }

  const userKeys = await getKeysPage(ownerId);
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

  const ownerId = ctx.from.id;

  if (callbackData.startsWith(PAGE_CALLBACK_QUERY_DATA + '_')) {
    const pageIndex = parseInt(callbackData.split('_')[1], 10);
    const totalKeys = session.data.totalKeys || (await getTotalKeys(ownerId));
    const userKeys = await getKeysPage(ownerId, pageIndex * KEYS_PER_PAGE);
    await displayKeysPage(ctx, userKeys, pageIndex, totalKeys);
  } else if (callbackData.startsWith(KEY_CALLBACK_QUERY_DATA + '_')) {
    await displayKeyDetails(ctx);
  } else if (callbackData.startsWith(DELETE_CALLBACK_QUERY_DATA + '_')) {
    await handleKeyDeletion(ctx, callbackData, ownerId);
  }
};

const handleKeyDeletion = async (
  ctx: Context,
  callbackData: string,
  ownerId: number
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

    const totalKeys = await getTotalKeys(ownerId);
    if (totalKeys === 0) {
      await ctx.editMessageText('ℹ You do not have any keys.', {
        parse_mode: 'HTML',
      });
      return;
    }

    const userKeys = await getKeysPage(ownerId);
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
  const inlineKeyboardMarkup = Markup.inlineKeyboard([
    Markup.button.callback('⬅', `${PAGE_CALLBACK_QUERY_DATA}_${0}`),
    Markup.button.callback('🗑', `${DELETE_CALLBACK_QUERY_DATA}_${key}`),
  ]).reply_markup;

  await updateMessage(
    ctx,
    await getUserSession(ctx.from.id),
    text,
    inlineKeyboardMarkup
  );
};

const getKeysPage = async (ownerId: number, skip = 0) =>
  prisma.telegramKey.findMany({
    where: { ownerId },
    skip,
    take: KEYS_PER_PAGE,
    orderBy: { description: 'asc' },
  });

const getTotalKeys = async (ownerId: number) =>
  prisma.telegramKey.count({
    where: { ownerId },
  });

export const handleShowKeysSteps = async (
  ctx: Context,
  session: UserSession
) => {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery)
    await handleButtonPress(ctx, session);
};
