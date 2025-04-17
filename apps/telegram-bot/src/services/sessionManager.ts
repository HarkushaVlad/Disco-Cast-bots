import { TelegramCommand } from '../types/command.types';
import { redisService } from '../../../../libs/shared/src/caching/redis.service';
import { TELEGRAM_SESSION_REDIS_ID } from '../constants/telegramConstants';
import { TelegramAction } from '../types/action.types';

type Interaction = TelegramCommand | TelegramAction;

export interface UserSession {
  userId: number;
  interaction: Interaction | null;
  step: string | null;
  data?: Record<string, any> | null;
}

const getSessionKey = (userId: number): string =>
  `${TELEGRAM_SESSION_REDIS_ID}:${userId}`;

export const getUserSession = async (
  userId: number
): Promise<UserSession | null> => {
  const sessionKey = getSessionKey(userId);
  const sessionData = await redisService.get(sessionKey);
  return sessionData ? JSON.parse(sessionData) : null;
};

export const setUserSession = async (
  userId: number,
  interaction: Interaction | null,
  step: string | null = null,
  data: Record<string, any> | null = null,
  ttlInSeconds: number = 3600
): Promise<UserSession> => {
  const session: UserSession = { userId, interaction, step, data };
  const sessionKey = getSessionKey(userId);
  await redisService.set(sessionKey, JSON.stringify(session), ttlInSeconds);
  return session;
};

export const updateUserSession = async (
  userId: number,
  updatedFields: Partial<Omit<UserSession, 'userId'>>,
  ttlInSeconds: number = 3600
): Promise<UserSession | null> => {
  const existingSession = await getUserSession(userId);
  if (!existingSession) {
    console.warn(`User session for ID ${userId} not found.`);
    return null;
  }

  const updatedSession: UserSession = { ...existingSession, ...updatedFields };
  const sessionKey = getSessionKey(userId);
  await redisService.set(
    sessionKey,
    JSON.stringify(updatedSession),
    ttlInSeconds
  );
  return updatedSession;
};

export const addUserSessionData = async (
  userId: number,
  newData: Record<string, any>,
  ttlInSeconds: number = 3600
): Promise<UserSession | null> => {
  const existingSession = await getUserSession(userId);
  if (!existingSession) {
    console.warn(`User session for ID ${userId} not found.`);
    return null;
  }

  const updatedSession: UserSession = {
    ...existingSession,
    data: { ...existingSession.data, ...newData },
  };
  const sessionKey = getSessionKey(userId);
  await redisService.set(
    sessionKey,
    JSON.stringify(updatedSession),
    ttlInSeconds
  );
  return updatedSession;
};

export const clearUserSession = async (userId: number): Promise<void> => {
  const sessionKey = getSessionKey(userId);
  await redisService.delete(sessionKey);
};
