import { TelegramCommand } from '../../../../libs/shared/src/types/command.types';

export interface UserSession {
  userId: number;
  command: TelegramCommand | null;
  step: string | null;
  data?: Record<string, any> | null;
}

const userSessions = new Map<number, UserSession>();

export const getUserSession = (userId: number): UserSession | undefined => {
  return userSessions.get(userId);
};

export const setUserSession = (
  userId: number,
  command: TelegramCommand | null,
  step: string | null,
  data?: Record<string, string> | null
) => {
  return userSessions.set(userId, { userId, command, step, data });
};

export const updateUserSession = (
  userId: number,
  updatedFields: Partial<Omit<UserSession, 'userId'>>
) => {
  const existingSession = userSessions.get(userId);
  if (!existingSession) {
    console.warn(`User session for ID ${userId} not found.`);
    return;
  }

  const updatedSession = { ...existingSession, ...updatedFields };
  userSessions.set(userId, updatedSession);
};

export const clearUserSession = (userId: number) => {
  userSessions.delete(userId);
};
