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

  constructor(bot: TgBot) {
    this.bot = bot;
  }

  async sendPost(post: PostPayload, telegramChannelIds: bigint[]) {
    if (this.hasMedia(post)) {
      await this.sendMedias(post, telegramChannelIds);
    } else {
      await this.sendTextMessage(post, telegramChannelIds);
    }
  }

  private hasMedia(post: PostPayload): boolean {
    return post && Object.values(post.medias).some((urls) => urls.length > 0);
  }

  private async sendTextMessage(
    post: PostPayload,
    telegramChannelIds: bigint[],
    isTurnOffLinkPreview?: boolean,
    specificText?: string
  ) {
    for (const channelId of telegramChannelIds) {
      try {
        await this.bot.telegram.sendMessage(
          channelId.toString(),
          this.getMessageText(post, telegramChannelIds, true, specificText),
          this.getMessageOptions(post, isTurnOffLinkPreview)
        );
        console.log(
          `Text message was successfully sent to channel ${channelId}\n`
        );
      } catch (error) {
        console.error(
          `Error sending text message to channel ${channelId}:`,
          error
        );
      }
    }
  }

  private async sendMedias(post: PostPayload, telegramChannelIds: bigint[]) {
    const mediaToSend: { type: MediaType; urls: string[] }[] = [];

    SEND_ORDER_MEDIAS.forEach((mediaType) => {
      const urls = post.medias[mediaType];
      if (urls && urls.length > 0) {
        mediaToSend.push({ type: mediaType, urls });
      }
    });

    for (const [index, media] of mediaToSend.entries()) {
      const { type, urls } = media;

      try {
        await this.sendMedia(type, urls, post, telegramChannelIds);
      } catch (error) {
        console.error(`Error sending ${type}:`, error);
      }
    }
  }

  private async sendMedia(
    type: MediaType,
    urls: string[],
    post: PostPayload,
    telegramChannelIds: bigint[]
  ) {
    switch (type) {
      case 'photo':
        await this.sendPhotoMediaGroup(urls, post, telegramChannelIds);
        break;
      case 'video':
        await this.sendVideoMediaGroup(urls, post, telegramChannelIds);
        break;
      case 'animation':
        await this.sendAnimationMediaGroup(urls, post, telegramChannelIds);
        break;
      case 'document':
        await this.sendDocumentMediaGroup(urls, post, telegramChannelIds);
        break;
    }
  }

  private async sendPhotoMediaGroup(
    urls: string[],
    post: PostPayload,
    telegramChannelIds: bigint[]
  ) {
    for (const channelId of telegramChannelIds) {
      const photoMediaGroup: MediaGroup = urls.map((url, index) => ({
        type: 'photo',
        media: url,
        caption:
          index === 0 ? this.getMessageText(post, telegramChannelIds) : null,
        ...this.getMessageOptions(post),
      }));

      try {
        await this.bot.telegram.sendMediaGroup(
          channelId.toString(),
          photoMediaGroup
        );
        console.log(
          `Photo group was successfully sent to channel ${channelId}`
        );
      } catch (error) {
        console.error(
          `Photo group was not sent to channel ${channelId}:`,
          error
        );
      }
    }
  }

  private async sendVideoMediaGroup(
    urls: string[],
    post: PostPayload,
    telegramChannelIds: bigint[]
  ) {
    for (const channelId of telegramChannelIds) {
      const videoMediaGroup: MediaGroup = urls.map((url, index) => ({
        type: 'video',
        media: url,
        caption:
          index === 0 ? this.getMessageText(post, telegramChannelIds) : null,
        ...this.getMessageOptions(post),
      }));

      try {
        await this.bot.telegram.sendMediaGroup(
          channelId.toString(),
          videoMediaGroup
        );
        console.log(
          `Video group was successfully sent to channel ${channelId}`
        );
      } catch (error) {
        console.error(
          `Video group was not sent to channel ${channelId}:`,
          error
        );
      }
    }
  }

  private async sendAnimationMediaGroup(
    urls: string[],
    post: PostPayload,
    telegramChannelIds: bigint[]
  ) {
    for (const channelId of telegramChannelIds) {
      for (const [index, url] of urls.entries()) {
        try {
          await this.bot.telegram.sendVideo(channelId.toString(), url, {
            caption:
              index === urls.length - 1
                ? this.getMessageText(post, telegramChannelIds)
                : null,
            ...this.getMessageOptions(post),
          });
          console.log(
            `Animation was successfully sent to channel ${channelId}`
          );
        } catch (error) {
          console.error(
            `Error sending animation to channel ${channelId}:`,
            error
          );
        }
      }
    }
  }

  private async sendDocumentMediaGroup(
    urls: string[],
    post: PostPayload,
    telegramChannelIds: bigint[]
  ) {
    const fileBuffers = await this.downloadFilesToBuffer(urls);

    const filenames = urls.map((url) => {
      const filenameWithQueryParams = url.split('/').pop();
      return filenameWithQueryParams?.split('?')[0];
    });
    const inputFiles = this.buffersToInputFiles(fileBuffers, filenames);

    for (const channelId of telegramChannelIds) {
      const documentsMediaGroup: MediaGroup = inputFiles.map(
        (inputFile, index) => {
          return {
            type: 'document',
            media: inputFile,
            caption:
              index === inputFiles.length - 1
                ? this.getMessageText(post, telegramChannelIds)
                : undefined,
            ...this.getMessageOptions(post),
          };
        }
      );

      try {
        await this.bot.telegram.sendMediaGroup(
          channelId.toString(),
          documentsMediaGroup
        );
        console.log(
          `Document group was successfully sent to channel ${channelId}`
        );
      } catch (error) {
        console.error(
          `Document group was not sent to channel ${channelId}:`,
          error
        );
      }
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

  private buffersToInputFiles(buffers: Buffer[], filenames: string[]) {
    return buffers.map((buffer, i) => {
      return {
        source: buffer,
        filename: filenames[i],
      };
    });
  }

  private getMessageText(
    post: PostPayload,
    telegramChannelIds: bigint[],
    isNoMedia: boolean = false,
    specificText?: string
  ): string {
    const sign = this.getMessageSign(post);
    const maxLength = isNoMedia
      ? MAX_CHARACTERS_TG_TEXT
      : MAX_CHARACTERS_TG_CAPTION;
    const arrowDownEmoji = '⬇️';

    const text = specificText ? specificText : post.text;

    if (!text) return sign;

    const signedText = `${text}${sign.length > 0 ? '\n\n' + sign : ''}`;

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
        this.sendTextMessage(
          post,
          telegramChannelIds,
          isNoLinks(remainingText),
          remainingText
        );
      }, 10000);
    }

    return `${truncatedText} ${arrowDownEmoji}\n\n${sign}`;
  }

  private getMessageOptions(
    post: PostPayload,
    isTurnOffLinkPreview?: boolean
  ): ExtraReplyMessage {
    return {
      parse_mode: 'HTML',
      link_preview_options: {
        is_disabled:
          isTurnOffLinkPreview !== undefined
            ? isTurnOffLinkPreview
            : isNoLinks(post.text),
      },
    };
  }

  private getMessageSign(post: PostPayload): string {
    const signsArr: string[] = [];

    if (post.channelsLink.withSource) {
      signsArr.push(`<a href="${post.messageUrl}">Source</a>`);
    }

    if (post.channelsLink.withHashtag) {
      signsArr.push(
        `#${post.channelsLink.discordChannel.name.replace('-', '')}`
      );
    }

    let signs = signsArr.join(' | ');

    if (post.channelsLink.withMention) {
      signs += `${signs.length > 0 ? '\n' : ''}<i>Powered by @discoCastBot</i>`;
    }

    return signs.length > 0 ? signs : '';
  }
}
