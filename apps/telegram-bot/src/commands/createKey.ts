import { Context } from 'telegraf';
import {
  clearUserSession,
  setUserSession,
  updateUserSession,
  UserSession,
} from '../services/sessionManager';
import {
  CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP,
  CREATE_TELEGRAM_KEY_COMMAND,
  CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP,
} from '../../../../libs/shared/src/constants/constants';
import { randomBytes } from 'crypto';
import { prisma } from '../services/prismaClient';

const generateUniqueKey = (length: number): string => {
  return randomBytes(length).toString('hex');
};

const isValidDescription = (ctx: Context, description: string) => {
  if (description.length < 2 || description.length > 40) {
    ctx.reply('❌ Description must be between 2 and 40 characters long.');
    return false;
  }
  return true;
};

const isUserAdmin = async (ctx: Context, channelId: number) => {
  try {
    const member = await ctx.telegram.getChatMember(channelId, ctx.from.id);
    if (member.status === 'administrator' || member.status === 'creator')
      return true;

    ctx.reply(
      '❌ You must be an admin of the specified chat to create a key for it.'
    );
    return false;
  } catch (error) {
    if (error.code !== 400)
      console.error('Error while verifying admin status:', error);
    return false;
  }
};

const isValidChannelId = async (ctx: Context, channelId: number) => {
  if (!channelId || isNaN(channelId)) {
    ctx.reply('❌ Please provide a valid numeric channel ID.');
    return false;
  }

  try {
    const chat = await ctx.telegram.getChat(channelId);
    if (!chat || chat.type !== 'channel') {
      ctx.reply('❌ Provided ID must be a valid channel ID.');
      return false;
    }
    return true;
  } catch {
    ctx.reply('❌ No channel found with the provided ID.');
    return false;
  }
};

const isKeyAlreadyExist = async (ctx: Context, channelId: number) => {
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

export const createKeyCommand = async (ctx: Context) => {
  const userId = ctx.from.id;
  setUserSession(
    userId,
    CREATE_TELEGRAM_KEY_COMMAND,
    CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP
  );
  ctx.reply(
    '↩️ Please forward a post from your channel or manually enter a channel ID.'
  );
};

const addChannelIdStep = async (ctx: Context) => {
  const userId = ctx.from.id;

  if (
    'forward_origin' in ctx.message &&
    ctx.message.forward_origin.type === 'channel'
  ) {
    const channelId = ctx.message.forward_origin.chat.id;

    if (
      !(await isValidChannelId(ctx, channelId)) ||
      (await isKeyAlreadyExist(ctx, channelId)) ||
      !(await isUserAdmin(ctx, channelId))
    ) {
      return;
    }

    updateUserSession(userId, {
      step: CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP,
      data: { channelId },
    });
    ctx.reply('Please enter a description to identify the key.');
    return;
  }

  if (!('forward_origin' in ctx.message) && 'text' in ctx.message) {
    const channelId = Number(ctx.message.text);

    if (
      isNaN(channelId) ||
      !(await isValidChannelId(ctx, channelId)) ||
      (await isKeyAlreadyExist(ctx, channelId)) ||
      !(await isUserAdmin(ctx, channelId))
    ) {
      return;
    }

    updateUserSession(userId, {
      step: CREATE_TELEGRAM_KEY_ADD_DESCRIPTION_STEP,
      data: { channelId },
    });
    ctx.reply('🗒 Please enter a description to identify the key.');
    return;
  }

  ctx.reply(
    '❌ Please forward a post from your channel or manually enter a valid channel ID.'
  );
};

const addDescriptionStep = async (ctx: Context, session: UserSession) => {
  if (!('text' in ctx.message)) {
    ctx.reply('❌ Provide a valid description.');
    return;
  }

  const description = ctx.message.text;

  if (!isValidDescription(ctx, description)) return;

  if (!session.data.channelId) {
    await createKeyCommand(ctx);
    return;
  }

  await createKey(ctx, session.data.channelId, description);
  clearUserSession(ctx.from.id);
};

const createKey = async (
  ctx: Context,
  channelId: number,
  description: string
) => {
  const uniqueKey = generateUniqueKey(8);

  try {
    const newKey = await prisma.telegramKey.create({
      data: { telegramChannelId: channelId, uniqueKey, description },
    });
    await ctx.telegram.sendMessage(
      ctx.from.id,
      `✅ Your key was created successfully!\n🔑 Unique Key: <code>${newKey.uniqueKey}</code>\n🗒 Description: <i>${newKey.description}</i>`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
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
