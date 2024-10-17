import axios from 'axios';
import { Message } from 'discord.js';
import { config } from '@sot-news-bot/shared';
import {
  Medias,
  MediaType,
  PostPayload,
} from '../../../../libs/shared/src/types/post.types';
import { channelTypeMap } from '../../../../libs/shared/src/constants/constants';
import { convertDiscordMarkdownToHTML } from '../../../../libs/shared/src/utils/filters';

export class DiscordPostService {
  private readonly message: Message;

  constructor(message: Message) {
    this.message = message;
  }

  async sendPost() {
    const filteredText = convertDiscordMarkdownToHTML(this.message);
    const medias = this.getMediasFromMessage(this.message);

    const post: PostPayload = {
      text: filteredText,
      medias,
      channelType: channelTypeMap.get(this.message.channelId) ?? 'other',
    };

    try {
      await axios.post(
        `http://localhost:${config.telegramServerPort}/send-message`,
        post
      );
      console.log(
        `Message from ${post.channelType} channel was successfully sent`
      );
    } catch (error) {
      console.error(
        `Message from ${post.channelType} channel was not sent`,
        error
      );
    }
  }

  private getMediasFromMessage(message: Message): Medias {
    const medias: Medias = {
      photo: [],
      video: [],
      animation: [],
      document: [],
    };

    message.attachments.forEach((attachment) => {
      const mediaType = this.identifyMediaType(attachment.contentType);
      medias[mediaType].push(attachment.url);
    });

    return medias;
  }

  private identifyMediaType(contentType: string): MediaType {
    if (!contentType) {
      return 'document';
    }

    if (contentType.includes('video')) {
      return 'video';
    }

    if (contentType === 'image/gif') {
      return 'animation';
    }

    if (contentType === 'image/png' || contentType === 'image/jpeg') {
      return 'photo';
    }

    return 'document';
  }
}
