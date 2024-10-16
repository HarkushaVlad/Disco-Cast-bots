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

export const convertDiscordMarkdownToHTML = (message: Message): string => {
  const mentions = getAllMentions(message);

  let rawText = escapeHtml(message.cleanContent);

  let text = convertAllMentions(rawText, mentions);

  text = text
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

    // Remove single backslashes (\) if they are not escaped and not followed by another backslash
    .replace(/(?<!\\)\\(?!\\)/g, '')

    // Replace double backslashes (\\) with a single backslash (\)
    .replace(/\\\\/g, '\\');

  return text;
};
