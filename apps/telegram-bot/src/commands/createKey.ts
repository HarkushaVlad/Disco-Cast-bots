import { Context, Markup } from 'telegraf';
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
  MAX_KEYS_PER_USER,
  REVOKE_CALLBACK_QUERY_DATA,
} from '../constants/telegramConstants';
import { deleteMessageFromDataIfExist } from '../services/telegramMessage.service';
import {
  DISCORD_GUILD_CHANNELS_REDIS_KEY,
  redisService,
} from '../../../../libs/shared/src/caching/redis.service';

const removeReplyMarkupFromMessage = async (ctx: Context) => {
  await ctx.telegram.editMessageReplyMarkup(
    ctx.callbackQuery.message.chat.id,
    ctx.callbackQuery.message.message_id,
    undefined,
    { inline_keyboard: [] }
  );
};

const generateUniqueKey = (length: number): string =>
  randomBytes(length).toString('hex');

const isValidDescription = (description: string): boolean =>
  description.length >= 2 && description.length <= 40;

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
  ) {
    await clearUserSession(userId);
    return;
  }

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
  channelId: number | string
): Promise<boolean> => {
  try {
    const member = await ctx.telegram.getChatMember(channelId, ctx.from.id);
    if (member.status === 'administrator' || member.status === 'creator')
      return true;
    ctx.reply('❌ You must be an admin of the specified channel.');
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
    include: {
      owner: true,
    },
  });
  if (existingKey) {
    ctx.reply(
      `ℹ A key for this channel already exists.\n🔑 <code>${existingKey.uniqueKey}</code>\n🗒 Description: <i>${existingKey.description}</i>\n👤 Creator: @${existingKey.owner.username}`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback(
            '🗑 Revoke key',
            `${REVOKE_CALLBACK_QUERY_DATA}_${existingKey.uniqueKey}`
          ),
        ]).reply_markup,
      }
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

export const revokeExistingTelegramKey = async (ctx: Context) => {
  if (!('data' in ctx.callbackQuery)) return;
  const [callback, telegramUniqueKey] = ctx.callbackQuery.data.split('_');

  const telegramKey = await prisma.telegramKey.findUnique({
    where: {
      uniqueKey: telegramUniqueKey,
    },
  });

  if (!telegramKey) {
    await removeReplyMarkupFromMessage(ctx);
    await ctx.answerCbQuery('❌ Key is not exists.');
    return;
  }

  if (callback !== REVOKE_CALLBACK_QUERY_DATA) return;
  if (!(await isUserAdmin(ctx, telegramKey.telegramChannelId.toString()))) {
    return;
  }

  const relatedGuildsInLinks = await prisma.channelsLink.findMany({
    where: {
      telegramKey: {
        uniqueKey: telegramUniqueKey,
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

  await prisma.telegramKey.delete({ where: { uniqueKey: telegramUniqueKey } });

  const discordGuildIds = [
    ...new Set(
      relatedGuildsInLinks.map(
        (link) =>
          `${DISCORD_GUILD_CHANNELS_REDIS_KEY}:${link.discordChannel.guild.discordGuildId}`
      )
    ),
  ];

  await redisService.delete(...discordGuildIds);

  await removeReplyMarkupFromMessage(ctx);

  await ctx.answerCbQuery('✅ Key successfully deleted.');
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

export const createKeyCommand = async (ctx: Context) => {
  const session = await getUserSession(ctx.from.id);
  deleteMessageFromDataIfExist(ctx, session);

  const keysCount = await prisma.telegramKey.count({
    where: {
      owner: {
        userId: ctx.from.id,
      },
    },
  });

  if (keysCount >= MAX_KEYS_PER_USER) {
    ctx.reply(
      `❌ You can only have up to ${MAX_KEYS_PER_USER} keys.\nTo manage your keys use /showkeys`
    );
    return;
  }

  await setUserSession(
    ctx.from.id,
    CREATE_TELEGRAM_KEY_COMMAND,
    CREATE_TELEGRAM_KEY_GET_GROUP_ID_STEP
  );
  ctx.reply(
    '↩️ Please forward a post from your channel or manually enter a channel ID.'
  );
};
