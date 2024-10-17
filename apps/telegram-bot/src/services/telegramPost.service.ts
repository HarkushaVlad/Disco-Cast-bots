import {
  MediaType,
  PostPayload,
} from '../../../../libs/shared/src/types/post.types';
import { TgBot } from '../bot';
import { MediaGroup } from 'telegraf/typings/telegram-types';
import axios from 'axios';
import { SEND_ORDER_MEDIAS } from '../../../../libs/shared/src/constants/constants';

export class TelegramPostService {
  private readonly bot: TgBot;
  private readonly telegramChannelId: string;
  private readonly post: PostPayload;

  constructor(bot: TgBot, telegramChannelId: string, post: PostPayload) {
    this.bot = bot;
    this.telegramChannelId = telegramChannelId;
    this.post = post;
  }

  async sendPost() {
    const hasMedia =
      this.post.medias &&
      Object.values(this.post.medias).some((urls) => urls.length > 0);

    if (hasMedia) {
      await this.sendMedias(this.telegramChannelId, this.post);
    } else {
      await this.sendTextMessage(this.telegramChannelId, this.post);
    }
  }

  private sendTextMessage = async (
    telegramChannelId: string,
    post: PostPayload
  ) => {
    try {
      await this.bot.telegram.sendMessage(telegramChannelId, post.text, {
        parse_mode: 'HTML',
      });
      console.log('Text message was successfully sent\n');
    } catch (error) {
      console.error('Error sending text message:', error);
    }
  };

  private async sendMedias(
    telegramChannelId: string,
    { medias, text }: PostPayload
  ) {
    const mediaToSend: { type: MediaType; urls: string[] }[] = [];

    SEND_ORDER_MEDIAS.forEach((mediaType) => {
      const urls = medias[mediaType];
      if (urls && urls.length > 0) {
        mediaToSend.push({ type: mediaType, urls });
      }
    });

    const onlyDocuments =
      mediaToSend.length === 1 && mediaToSend[0].type === 'document';

    for (const [index, media] of mediaToSend.entries()) {
      const { type, urls } = media;
      const isLast = index === mediaToSend.length - 1;
      let caption: string | undefined;

      if (isLast && !onlyDocuments) {
        caption = text;
      } else if (onlyDocuments) {
        caption = text;
      }

      try {
        switch (type) {
          case 'photo':
            await this.sendPhotoMediaGroup(telegramChannelId, urls, caption);
            break;
          case 'video':
            await this.sendVideoMediaGroup(telegramChannelId, urls, caption);
            break;
          case 'animation':
            await this.sendAnimationMediaGroup(
              telegramChannelId,
              urls,
              caption
            );
            break;
          case 'document':
            await this.sendDocumentMediaGroup(telegramChannelId, urls, caption);
            break;
        }
      } catch (error) {
        console.error(`Error sending ${type}:`, error);
      }
    }
  }

  private async sendPhotoMediaGroup(
    telegramChannelId: string,
    urls: string[],
    text: string
  ) {
    const photoMediaGroup: MediaGroup = urls.map((url, index) => ({
      type: 'photo',
      media: url,
      caption: index === 0 ? text : undefined,
      parse_mode: 'HTML',
    }));

    try {
      await this.sendMediaGroup(telegramChannelId, photoMediaGroup);
    } catch (error) {
      console.error('Photo group was not sent:', error);
    }
  }

  private async sendVideoMediaGroup(
    telegramChannelId: string,
    urls: string[],
    text: string
  ) {
    const videoMediaGroup: MediaGroup = urls.map((url, index) => ({
      type: 'video',
      media: url,
      caption: index === 0 ? text : undefined,
      parse_mode: 'HTML',
    }));

    try {
      await this.sendMediaGroup(telegramChannelId, videoMediaGroup);
    } catch {
      try {
        await this.sendAnimationMediaGroup(telegramChannelId, urls, text);
      } catch (error) {
        console.error('Video group was not sent (as animation tried):', error);
      }
    }
  }

  private async sendAnimationMediaGroup(
    telegramChannelId: string,
    urls: string[],
    text: string
  ) {
    const indexOfLastAnimationFile = urls.length - 1;

    for (const [index, url] of urls.entries()) {
      try {
        await this.bot.telegram.sendVideo(telegramChannelId, url, {
          caption: index === indexOfLastAnimationFile ? text : undefined,
          parse_mode: 'HTML',
        });
        console.log('Video was successfully sent');
      } catch (error) {
        console.error('Error sending video:', error);
      }
    }
  }

  private async sendDocumentMediaGroup(
    telegramChannelId: string,
    urls: string[],
    text: string
  ) {
    const fileBuffers = await this.downloadFilesToBuffer(urls);

    const inputFiles = this.buffersToInputFiles(fileBuffers);

    const indexOfLastInputFile = inputFiles.length - 1;

    const documentsMediaGroup: MediaGroup = inputFiles.map(
      (inputFile, index) => {
        return {
          type: 'document',
          media: inputFile,
          caption: index === indexOfLastInputFile ? text : undefined,
          parse_mode: 'HTML',
        };
      }
    );

    try {
      await this.sendMediaGroup(telegramChannelId, documentsMediaGroup);
    } catch (error) {
      console.error('Document group was not sent:', error);
    }
  }

  private async sendMediaGroup(
    telegramChannelId: string,
    mediaGroup: MediaGroup
  ) {
    try {
      await this.bot.telegram.sendMediaGroup(telegramChannelId, mediaGroup);
    } catch (error) {
      throw error;
    }
  }

  private async downloadFilesToBuffer(urls: string[]) {
    const responses = await Promise.all(
      urls.map((url: string) => this.downloadFile(url))
    );

    return responses
      .filter((response) => response && response.data)
      .map((response) => Buffer.from(response!.data));
  }

  private async downloadFile(url: string) {
    try {
      return await axios.get(url, { responseType: 'arraybuffer' });
    } catch (error) {
      console.error(`Error downloading ${url}:`, error);
      return null;
    }
  }

  private buffersToInputFiles(buffers: Buffer[]) {
    return buffers.map((buffer) => {
      return {
        source: buffer,
        filename: 'placeholder',
      };
    });
  }
}
