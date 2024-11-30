import { prisma } from './prismaClient';
import { TelegramUser } from '@prisma/client';
import { Context } from 'telegraf';

export const getOrCreateTelegramUser = async (
  ctx: Context
): Promise<TelegramUser> => {
  const user = await prisma.telegramUser.findUnique({
    where: { userId: ctx.from.id },
  });

  if (!user) {
    const telegramUser = ctx.from;
    return prisma.telegramUser.create({
      data: {
        userId: telegramUser.id,
        chatId: ctx.chat.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        languageCode: telegramUser.language_code,
      },
    });
  }

  return user;
};
