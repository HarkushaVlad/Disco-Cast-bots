import {
  MediaType,
  PostPayload,
} from '../../../../libs/shared/src/types/post.types';
import { TgBot } from '../bot';
import { ExtraReplyMessage, MediaGroup } from 'telegraf/typings/telegram-types';
import {
  MAX_CHARACTERS_TG_CAPTION,
  MAX_CHARACTERS_TG_TEXT,
  SEND_ORDER_MEDIAS,
} from '../../../../libs/shared/src/constants/constants';
import { isNoLinks } from '../../../../libs/shared/src/utils/filters';
import axios from 'axios';

export class TelegramPostService {
  private readonly bot: TgBot;
  private readonly telegramChannelId: string;
  private readonly post: PostPayload;
  private readonly isNoLinks: boolean;

  constructor(bot: TgBot, telegramChannelId: string, post: PostPayload) {
    this.bot = bot;
    this.telegramChannelId = telegramChannelId;
    this.post = post;
    this.isNoLinks = isNoLinks(post.text);
  }

  async sendPost() {
    if (this.hasMedia()) {
      await this.sendMedias();
    } else {
      await this.sendTextMessage(this.post.text);
    }
  }

  private hasMedia(): boolean {
    return (
      this.post.medias &&
      Object.values(this.post.medias).some((urls) => urls.length > 0)
    );
  }

  private async sendTextMessage(text: string, isTurnOffLinkPreview?: boolean) {
    try {
      await this.bot.telegram.sendMessage(
        this.telegramChannelId,
        this.getMessageText(text, true),
        this.getMessageOptions(isTurnOffLinkPreview)
      );
      console.log('Text message was successfully sent\n');
    } catch (error) {
      console.error('Error sending text message:', error);
    }
  }

  private async sendMedias() {
    const mediaToSend: { type: MediaType; urls: string[] }[] = [];

    SEND_ORDER_MEDIAS.forEach((mediaType) => {
      const urls = this.post.medias[mediaType];
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
        caption = this.post.text;
      } else if (onlyDocuments) {
        caption = this.post.text;
      }

      try {
        await this.sendMedia(type, urls, caption);
      } catch (error) {
        console.error(`Error sending ${type}:`, error);
      }
    }
  }

  private async sendMedia(type: MediaType, urls: string[], caption?: string) {
    switch (type) {
      case 'photo':
        await this.sendPhotoMediaGroup(urls, caption);
        break;
      case 'video':
        await this.sendVideoMediaGroup(urls, caption);
        break;
      case 'animation':
        await this.sendAnimationMediaGroup(urls, caption);
        break;
      case 'document':
        await this.sendDocumentMediaGroup(urls, caption);
        break;
    }
  }

  private async sendPhotoMediaGroup(urls: string[], text?: string) {
    const photoMediaGroup: MediaGroup = urls.map((url, index) => ({
      type: 'photo',
      media: url,
      caption:
        index === 0 ? this.getMessageText(text || '') : this.getMessageSign(),
      ...this.getMessageOptions(),
    }));

    try {
      await this.sendMediaGroup(photoMediaGroup);
      console.log('Photo group was successfully sent');
    } catch (error) {
      console.error('Photo group was not sent:', error);
    }
  }

  private async sendVideoMediaGroup(urls: string[], text: string) {
    const videoMediaGroup: MediaGroup = urls.map((url, index) => ({
      type: 'video',
      media: url,
      caption: index === 0 ? this.getMessageText(text) : this.getMessageSign(),
      ...this.getMessageOptions(),
    }));

    try {
      await this.sendMediaGroup(videoMediaGroup);
    } catch {
      try {
        await this.sendAnimationMediaGroup(urls, text);
        console.log('Video group  was successfully sent');
      } catch (error) {
        console.error('Video group was not sent (as animation tried):', error);
      }
    }
  }

  private async sendAnimationMediaGroup(urls: string[], text: string) {
    const indexOfLastAnimationFile = urls.length - 1;

    for (const [index, url] of urls.entries()) {
      try {
        await this.bot.telegram.sendVideo(this.telegramChannelId, url, {
          caption:
            index === indexOfLastAnimationFile
              ? this.getMessageText(text)
              : this.getMessageSign(),
          ...this.getMessageOptions(),
        });
        console.log('Video was successfully sent');
      } catch (error) {
        console.error('Error sending video:', error);
      }
    }
  }

  private async sendDocumentMediaGroup(urls: string[], text: string) {
    const fileBuffers = await this.downloadFilesToBuffer(urls);

    const inputFiles = this.buffersToInputFiles(fileBuffers);

    const indexOfLastInputFile = inputFiles.length - 1;

    const documentsMediaGroup: MediaGroup = inputFiles.map(
      (inputFile, index) => {
        return {
          type: 'document',
          media: inputFile,
          caption:
            index === indexOfLastInputFile
              ? this.getMessageText(text)
              : undefined,
          ...this.getMessageOptions(),
        };
      }
    );

    try {
      await this.sendMediaGroup(documentsMediaGroup);
      console.log('Document group  was successfully sent');
    } catch (error) {
      console.error('Document group was not sent:', error);
    }
  }

  private async sendMediaGroup(mediaGroup: MediaGroup) {
    try {
      await this.bot.telegram.sendMediaGroup(
        this.telegramChannelId,
        mediaGroup
      );
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

  private getMessageText(text: string, isNoMedia: boolean = false): string {
    const sign = this.getMessageSign();
    const maxLength = isNoMedia
      ? MAX_CHARACTERS_TG_TEXT
      : MAX_CHARACTERS_TG_CAPTION;
    const arrowDownEmoji = '⬇️';

    if (!text) return sign;

    const signedText = `${text}\n\n${sign}`;

    if (signedText.length <= maxLength) return signedText;

    const truncatedLength = maxLength - sign.length - arrowDownEmoji.length - 1;
    let truncatedText = text.slice(0, truncatedLength);

    const lastSpaceIndex = truncatedText.lastIndexOf(' ');

    if (lastSpaceIndex > 0) {
      truncatedText = truncatedText.slice(0, lastSpaceIndex);
    }

    const remainingText = text.slice(truncatedText.length).trim();

    if (remainingText) {
      setTimeout(() => {
        this.sendTextMessage(remainingText, isNoLinks(remainingText));
      }, 10000);
    }

    return `${truncatedText} ${arrowDownEmoji}\n\n${sign}`;
  }

  private getMessageOptions(isTurnOffLinkPreview?: boolean): ExtraReplyMessage {
    return {
      parse_mode: 'HTML',
      link_preview_options: {
        is_disabled:
          isTurnOffLinkPreview !== undefined
            ? isTurnOffLinkPreview
            : this.isNoLinks,
      },
    };
  }

  private getMessageSign(): string {
    return `<a href="${this.post.messageUrl}">Source</a> | ${this.post.channelType}`;
  }
}
