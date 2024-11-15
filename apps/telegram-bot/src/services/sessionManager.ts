import { TelegramCommand } from '../types/command.types';

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
  step: string | null = null,
  data: Record<string, any> | null = null
): UserSession => {
  const session: UserSession = { userId, command, step, data };
  userSessions.set(userId, session);
  return session;
};

export const updateUserSession = (
  userId: number,
  updatedFields: Partial<Omit<UserSession, 'userId'>>
): UserSession | undefined => {
  const existingSession = userSessions.get(userId);
  if (!existingSession) {
    console.warn(`User session for ID ${userId} not found.`);
    return;
  }

  const updatedSession: UserSession = { ...existingSession, ...updatedFields };
  userSessions.set(userId, updatedSession);
  return updatedSession;
};

export const addUserSessionData = (
  userId: number,
  newData: Record<string, any>
): UserSession | undefined => {
  const existingSession = userSessions.get(userId);
  if (!existingSession) {
    console.warn(`User session for ID ${userId} not found.`);
    return;
  }

  const updatedSession: UserSession = {
    ...existingSession,
    data: { ...existingSession.data, ...newData },
  };
  userSessions.set(userId, updatedSession);
  return updatedSession;
};

export const clearUserSession = (userId: number): void => {
  userSessions.delete(userId);
};
