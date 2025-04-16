import { Context } from 'telegraf';
import { UserSession } from './sessionManager';

export const deleteMessageFromDataIfExist = (
  ctx: Context,
  session: UserSession
) => {
  if (session?.data?.messageId) {
    ctx.telegram.deleteMessage(ctx.chat.id, session.data.messageId);
  }
};
