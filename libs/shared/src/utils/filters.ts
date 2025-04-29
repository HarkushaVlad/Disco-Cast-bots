import { Message } from 'discord.js';

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const getAllMentions = (message: Message): (string | null)[] => {
  return message.mentions.users.map((user) => user.globalName);
};

const convertAllMentions = (
  text: string,
  mentions: (string | null)[]
): string => {
  mentions.forEach((mention) => {
    if (mention) {
      const mentionRegex = new RegExp(`(?<=\\s|^)@(${mention})\\b`, 'g');
      text = text.replace(mentionRegex, `<u>$1</u>`);
    }
  });

  return text;
};

// Replace Discord timestamp tags like <t:TIMESTAMP:F> with actual date strings
const convertTimestamps = (text: string): string => {
  return text.replace(
    /<t:(\d{10})(?::([a-zA-Z]))?>/g,
    (_, timestampStr, format = 'f') => {
      const timestamp = parseInt(timestampStr, 10) * 1000;
      const date = new Date(timestamp);

      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'UTC',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      };

      switch (format) {
        case 't':
          return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
        case 'T':
          return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
          });
        case 'd':
          return date.toLocaleDateString('en-GB');
        case 'D':
          return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        case 'f':
          return date.toLocaleString('en-US', {
            ...options,
            weekday: undefined,
          });
        case 'F':
          return date.toLocaleString('en-US', options);
        case 'R': {
          const diff = Date.now() - timestamp;
          const seconds = Math.floor(diff / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          if (Math.abs(days) >= 1)
            return `${days} day(s) ${diff > 0 ? 'ago' : 'from now'}`;
          if (Math.abs(hours) >= 1)
            return `${hours} hour(s) ${diff > 0 ? 'ago' : 'from now'}`;
          return `${minutes} minute(s) ${diff > 0 ? 'ago' : 'from now'}`;
        }
        default:
          return date.toLocaleString();
      }
    }
  );
};

export const convertDiscordMarkdownToHTML = (message: Message): string => {
  const mentions = getAllMentions(message);

  let rawText = escapeHtml(message.cleanContent);

  let text = convertAllMentions(rawText, mentions);

  text = convertTimestamps(text);

  const convertedText = text
    // Remove custom emojis
    .replace(/:[a-zA-Z0-9_]+:/g, '')

    // Remove angle brackets around URLs like <https://example.com>
    .replace(/<((?:https?|ftp):\/\/[^ >]+)>/g, '$1')

    // Replace triple asterisks (***text***) with bold italic (<b><i>text</i></b>)
    .replace(/(?<!\\)\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>')

    // Replace double asterisks (**text**) with bold (<b>text</b>)
    .replace(/(?<!\\)\*\*(.*?)\*\*/g, '<b>$1</b>')

    // Replace double underscores (__text__) with underline (<u>text</u>)
    .replace(/(?<!\\)__(.*?)__/g, '<u>$1</u>')

    // Replace single asterisks (*text*) with italic (<i>text</i>)
    .replace(/(?<!\\)\*(.*?)\*/g, '<i>$1</i>')

    // Replace single underscores (_text_) with italic (<i>text</i>)
    .replace(/(?<!\\)_(.*?)_/g, '<i>$1</i>')

    // Replace double tildes (~~text~~) with strikethrough (<s>text</s>)
    .replace(/(?<!\\)~~(.*?)~~/g, '<s>$1</s>')

    // Replace backtick-enclosed text (`text`) with code formatting (<code>text</code>)
    .replace(/(?<!\\)(`+)(.*?)\1/g, '<code>$2</code>')

    // Remove @here and @everyone mentions
    .replace(/@here|@everyone/g, '')

    // Remove single backslashes (\) if they are not escaped, followed by [_*~] and not followed by another backslash
    .replace(/(?<!\\)\\(?!\\)(?=[_*~])/g, '')

    // Replace double backslashes (\\) with a single backslash (\)
    .replace(/\\\\/g, '\\')

    // Remove spaces at the beginning of each line
    .replace(/^ +/gm, '')

    // Replace multiple spaces (2 or more) with a single space
    .replace(/ +/g, ' ');

  return convertedText;
};

export const isNoLinks = (text: string): boolean => {
  const urlRegex = /https?:\/\/\S+/g;
  const matches = text.match(urlRegex);
  return matches === null || matches.length === 0;
};
