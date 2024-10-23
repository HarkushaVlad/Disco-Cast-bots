import { Context } from 'telegraf';
import { prisma } from '../services/prismaClient';
import { randomBytes } from 'crypto';

type Chat = 'channel' | 'group' | 'supergroup' | 'private';

const isUserAdmin = async (ctx: Context, chatId?: number, userId?: number) => {
  try {
    const chatMember = await ctx.telegram.getChatMember(
      chatId ?? ctx.chat.id,
      userId ?? ctx.message.from.id
    );

    return (
      chatMember.status === 'administrator' || chatMember.status === 'creator'
    );
  } catch (error) {
    console.error('❌ Error while verifying admin status:', error);
    return false;
  }
};

const isValidChatId = async (
  ctx: Context,
  chatTypes: Chat[],
  chatId?: number
) => {
  try {
    chatId = chatId ?? ctx.chat.id;

    if (!chatId || isNaN(chatId)) {
      ctx.reply('❌ Please provide a valid ID.');
      return false;
    }

    const chat = await ctx.telegram.getChat(chatId);

    if (!chat) {
      ctx.reply(`❌ No ${chatTypes.join('/')} found with the provided ID.`);
      return false;
    }

    if (!chatTypes.includes(chat.type)) {
      ctx.reply(`❌ Provided id should be ${chatTypes.join('/')} id.`);
      return false;
    }

    return true;
  } catch (error) {
    ctx.reply(`❌ No ${chatTypes.join('/')} found with the provided ID.`);
    return false;
  }
};

const isValidDescription = (ctx: Context, description: string) => {
  if (description.length < 2) {
    ctx.reply('❌ Description must be at least 2 characters long.');
    return false;
  }

  if (description.length > 20) {
    ctx.reply('❌ Description must be no more than 20 characters long.');
    return false;
  }

  return true;
};

const handlePrivateChatCommand = async (
  ctx: Context,
  chatId: string,
  description: string
) => {
  const channelId = Number(chatId);

  const isChannelIdValid = await isValidChatId(ctx, ['channel'], channelId);
  if (!isChannelIdValid) {
    return;
  }

  const isAdmin = await isUserAdmin(ctx, channelId, ctx.from.id);
  if (!isAdmin) {
    ctx.reply(
      '❌ You must be an admin of the specified channel to create a key for it.'
    );
    return;
  }

  await createAndSendKey(ctx, channelId, description);
};

const handleGroupChatCommand = async (ctx: Context, description: string) => {
  const isGroupChatIdValid = await isValidChatId(
    ctx,
    ['group', 'supergroup'],
    ctx.chat.id
  );
  if (!isGroupChatIdValid) {
    return;
  }

  const isAdmin = await isUserAdmin(ctx);
  if (!isAdmin) {
    ctx.reply(
      '❌ You must be an admin of the specified chat to create a key for it.'
    );
    return;
  }

  await createAndSendKey(ctx, ctx.chat.id, description);
};

const generateUniqueKey = (length: number): string => {
  return randomBytes(length).toString('hex');
};

const createAndSendKey = async (
  ctx: Context,
  chatId: number,
  description: string
) => {
  const existingKey = await prisma.telegramKey.findUnique({
    where: {
      telegramChannelId: chatId,
    },
  });

  if (existingKey !== null) {
    ctx.reply(
      `ℹ A key for this channel has already been created.\n🔑 <code>${existingKey.uniqueKey}</code>`,
      {
        parse_mode: 'HTML',
      }
    );
    return;
  }

  const isGroupChat =
    ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';

  if (isGroupChat) {
    try {
      await ctx.telegram.sendMessage(ctx.from.id, `🔑 Generating a key..`);
    } catch (error) {
      ctx.reply(
        '❌ I could not send you a private message. Please start a conversation with <a href="https://t.me/DiscoCastBot">me</a> and try again.',
        {
          parse_mode: 'HTML',
        }
      );
      return;
    }
  }

  const uniqueKey = generateUniqueKey(8);
  try {
    const newKey = await prisma.telegramKey.create({
      data: {
        telegramChannelId: chatId,
        uniqueKey,
        description,
      },
    });

    await ctx.telegram.sendMessage(
      ctx.from.id,
      `✅ Your key has been created successfully! \n🔑 Unique Key: <code>${newKey.uniqueKey}</code>\n🗒 Description: <i>${newKey.description}</i>`,
      {
        parse_mode: 'HTML',
      }
    );

    if (isGroupChat) {
      ctx.reply('✅ The key has been sent to you in a private message.');
    }
  } catch (error) {
    ctx.reply('❌ Oops, something went wrong, try again later.');
  }
};

export const createKeyCommand = async (ctx: Context) => {
  if (!('text' in ctx.message)) {
    ctx.reply('❌ This command must include a description.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);

  // Private chat
  if (ctx.chat.type === 'private') {
    const channelId = args[0];
    const description = args.slice(1).join(' ');
    if (!isValidDescription(ctx, description)) return;
    await handlePrivateChatCommand(ctx, channelId, description);
    return;
  }

  // Group chat
  const description = args.join(' ');
  if (!isValidDescription(ctx, description)) return;
  await handleGroupChatCommand(ctx, description);
};
