import { Context, Markup } from 'telegraf';
import { prisma } from '../services/prismaClient';
import { TelegramKey } from '@prisma/client';
import {
  addUserSessionData,
  setUserSession,
  updateUserSession,
  UserSession,
} from '../services/sessionManager';
import { SHOW_TELEGRAMS_KEYS_COMMAND } from '../../../../libs/shared/src/constants/constants';

const KEYS_PER_PAGE = 3;

export const showKeysCommand = async (ctx: Context) => {
  const ownerId = ctx.from.id;

  setUserSession(ownerId, SHOW_TELEGRAMS_KEYS_COMMAND);

  const totalKeys = await getTotalKeys(ownerId);
  const userKeys = await getKeysPage(ownerId);

  if (userKeys.length === 0) {
    ctx.reply('ℹ You do not have any keys.');
    return;
  }

  await displayKeysPage(ctx, userKeys, 0, totalKeys);
};

const displayKeysPage = async (
  ctx: Context,
  keys: TelegramKey[],
  pageIndex: number,
  totalKeys: number
) => {
  const totalPages = Math.ceil(totalKeys / KEYS_PER_PAGE);

  const keyButtons = keys.map((key) =>
    Markup.button.callback(`🔑 ${key.description}`, `key_${key.uniqueKey}`)
  );

  const paginationButtons = createPaginationButtons(pageIndex, totalPages);

  const session = addUserSessionData(ctx.from.id, { totalKeys });

  const text = `${pageIndex + 1}️⃣|${totalPages}️⃣ - Here are your keys:`;
  const inlineKeyboardMarkup = Markup.inlineKeyboard([
    ...keyButtons.map((btn) => [btn]),
    paginationButtons,
  ]);

  if ('messageId' in session.data) {
    try {
      ctx.telegram.editMessageText(
        ctx.chat.id,
        session.data.messageId,
        undefined,
        text,
        inlineKeyboardMarkup
      );
      return;
    } catch (error) {
      console.error(error);
    }
  }

  const sentMessage = await ctx.reply(text, inlineKeyboardMarkup);
  updateUserSession(ctx.from.id, {
    data: { ...session.data, messageId: sentMessage.message_id },
  });
};

const handleButtonPress = async (ctx: Context, session: UserSession) => {
  if (!(ctx.callbackQuery && 'data' in ctx.callbackQuery)) {
    return;
  }

  const callbackData = ctx.callbackQuery.data;

  if (callbackData.startsWith('page_')) {
    const pageIndex = parseInt(callbackData.split('_')[1], 10);
    const ownerId = ctx.from.id;

    const totalKeys =
      (session.data.totalPages as number) ?? (await getTotalKeys(ownerId));
    const userKeys = await getKeysPage(ownerId, pageIndex * KEYS_PER_PAGE);

    await displayKeysPage(ctx, userKeys, pageIndex, totalKeys);
  } else if (callbackData.startsWith('key_')) {
    await displayKeyDetails(ctx);
  }
};

const createPaginationButtons = (pageIndex: number, totalPages: number) => {
  const paginationButtons = [];
  if (pageIndex > 0) {
    paginationButtons.push(
      Markup.button.callback('⬅', `page_${pageIndex - 1}`)
    );
  }
  if (pageIndex + 1 < totalPages) {
    paginationButtons.push(
      Markup.button.callback('➡', `page_${pageIndex + 1}`)
    );
  }
  return paginationButtons;
};

const displayKeyDetails = async (ctx: Context) => {
  if (
    !(
      ctx.callbackQuery &&
      'data' in ctx.callbackQuery &&
      ctx.callbackQuery.data.startsWith('key_')
    )
  ) {
    return;
  }

  const uniqueKey = ctx.callbackQuery.data.split('_')[1];
  console.log(`Selected key data: ${uniqueKey}`);
  await ctx.answerCbQuery(`You selected key with ID: ${uniqueKey}`);
};

const getKeysPage = async (ownerId: number, skip = 0) => {
  return prisma.telegramKey.findMany({
    where: { ownerId },
    skip,
    take: KEYS_PER_PAGE,
    orderBy: { description: 'asc' },
  });
};

const getTotalKeys = async (ownerId: number) => {
  return prisma.telegramKey.count({
    where: { ownerId },
  });
};

export const handleShowKeysSteps = async (
  ctx: Context,
  session: UserSession
) => {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
    await handleButtonPress(ctx, session);
  }
};
