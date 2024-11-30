import { Context } from 'telegraf';
import {
  clearUserSession,
  getUserSession,
  setUserSession,
  updateUserSession,
  UserSession,
} from '../services/sessionManager';

import { randomBytes } from 'crypto';
import { prisma } from '../services/prismaClient';
import { getOrCreateTelegramUser } from '../services/telegramUser.service';
import {
  CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP,
  CREATE_TELEGRAM_KEY_COMMAND,
  CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP,
} from '../constants/telegramConstants';
import { deleteMessageFromDataIfExist } from '../services/telegramMessage.service';

const generateUniqueKey = (length: number): string =>
  randomBytes(length).toString('hex');

const isValidDescription = (description: string): boolean =>
  description.length >= 2 && description.length <= 40;

export const createKeyCommand = async (ctx: Context) => {
  const session = await getUserSession(ctx.from.id);
  deleteMessageFromDataIfExist(ctx, session);

  await setUserSession(
    ctx.from.id,
    CREATE_TELEGRAM_KEY_COMMAND,
    CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP
  );
  ctx.reply(
    '↩️ Please forward a post from your channel or manually enter a channel ID.'
  );
};

const addChannelIdStep = async (ctx: Context) => {
  const userId = ctx.from.id;
  const channelId = extractChannelId(ctx);

  if (!channelId) {
    ctx.reply(
      '❌ Please forward a post from your channel or manually enter a valid channel ID.'
    );
    return;
  }

  if (
    !(await isValidChannel(ctx, channelId)) ||
    (await isKeyAlreadyExist(ctx, channelId)) ||
    !(await isUserAdmin(ctx, channelId))
  )
    return;

  await updateUserSession(userId, {
    step: CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP,
    data: { channelId },
  });
  ctx.reply('🗒 Please enter a description to identify the key.');
};

const extractChannelId = (ctx: Context): number | null => {
  if (
    'forward_origin' in ctx.message &&
    ctx.message.forward_origin.type === 'channel'
  ) {
    return ctx.message.forward_origin.chat.id;
  } else if ('text' in ctx.message) {
    const channelId = Number(ctx.message.text);
    return isNaN(channelId) ? null : channelId;
  }
  return null;
};

const isValidChannel = async (
  ctx: Context,
  channelId: number
): Promise<boolean> => {
  try {
    const chat = await ctx.telegram.getChat(channelId);
    if (chat?.type !== 'channel') {
      ctx.reply('❌ Provided ID must be a valid channel ID.');
      return false;
    }
    return true;
  } catch {
    ctx.reply('❌ No channel found with the provided ID.');
    return false;
  }
};

const isUserAdmin = async (
  ctx: Context,
  channelId: number
): Promise<boolean> => {
  try {
    const member = await ctx.telegram.getChatMember(channelId, ctx.from.id);
    if (member.status === 'administrator' || member.status === 'creator')
      return true;
    ctx.reply(
      '❌ You must be an admin of the specified chat to create a key for it.'
    );
  } catch (error) {
    if (error.code !== 400)
      console.error('Error while verifying admin status:', error);
  }
  return false;
};

const isKeyAlreadyExist = async (
  ctx: Context,
  channelId: number
): Promise<boolean> => {
  const existingKey = await prisma.telegramKey.findUnique({
    where: { telegramChannelId: channelId },
  });
  if (existingKey) {
    ctx.reply(
      `ℹ A key for this channel already exists.\n🔑 <code>${existingKey.uniqueKey}</code>\n🗒 Description: <i>${existingKey.description}</i>`,
      { parse_mode: 'HTML' }
    );
    return true;
  }
  return false;
};

const addDescriptionStep = async (ctx: Context, session: UserSession) => {
  if (!('text' in ctx.message) || !isValidDescription(ctx.message.text)) {
    ctx.reply('❌ Provide a valid description (2-40 characters).');
    return;
  }

  if (!session.data?.channelId) {
    await createKeyCommand(ctx);
    return;
  }

  await createKey(ctx, session.data.channelId, ctx.message.text);
  await clearUserSession(ctx.from.id);
};

const createKey = async (
  ctx: Context,
  channelId: number,
  description: string
) => {
  const uniqueKey = generateUniqueKey(8);
  const telegramUser = await getOrCreateTelegramUser(ctx);

  try {
    const newKey = await prisma.telegramKey.create({
      data: {
        ownerId: telegramUser.id,
        telegramChannelId: channelId,
        uniqueKey,
        description,
      },
    });
    await ctx.telegram.sendMessage(
      ctx.from.id,
      `✅ Your key was created successfully!\n🔑 Unique Key: <code>${newKey.uniqueKey}</code>\n🗒 Description: <i>${newKey.description}</i>`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Error creating key:', error);
    ctx.reply('❌ Oops, something went wrong. Try again later.');
  }
};

export const handleCreateKeySteps = async (
  ctx: Context,
  session: UserSession
) => {
  switch (session.step) {
    case CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP:
      await addChannelIdStep(ctx);
      break;
    case CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP:
      await addDescriptionStep(ctx, session);
      break;
  }
};
