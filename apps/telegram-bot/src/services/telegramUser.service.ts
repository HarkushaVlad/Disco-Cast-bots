import { prisma } from './prismaClient';
import { TelegramUser } from '@prisma/client';

export const getOrCreateTelegramUser = async (
  userId: number
): Promise<TelegramUser> => {
  const user = await prisma.telegramUser.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return prisma.telegramUser.create({
      data: {
        id: userId,
      },
    });
  }

  return user;
};
