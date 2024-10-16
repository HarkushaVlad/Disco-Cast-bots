import axios from 'axios';
import { Message } from 'discord.js';
import { config } from '@sot-news-bot/shared';
import { PostPayload } from '../../../../libs/shared/src/types/post.types';
import { channelTypeMap } from '../../../../libs/shared/src/constants/constants';
import { convertDiscordMarkdownToHTML } from '../../../../libs/shared/src/utils/filters';

export class DiscordPostService {
  private readonly message: Message;

  constructor(message: Message) {
    this.message = message;
  }

  async sendPost() {
    const filteredText = convertDiscordMarkdownToHTML(this.message);
    const media = this.message.attachments.map((attachment) => attachment.url);

    const post: PostPayload = {
      text: filteredText,
      media,
      postType: channelTypeMap.get(this.message.channelId) ?? 'other',
    };

    try {
      await axios.post(
        `http://localhost:${config.telegramServerPort}/send-message`,
        post
      );
      console.log(
        `Message from ${post.postType} channel was successfully sent`
      );
    } catch (error) {
      console.error(
        `Message from ${post.postType} channel was not sent`,
        error
      );
    }
  }
}
