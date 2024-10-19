import { ChannelType, Message } from 'discord.js';
import {
  Medias,
  MediaType,
  PostPayload,
} from '../../../../libs/shared/src/types/post.types';
import { Channel } from 'amqplib';
import { convertDiscordMarkdownToHTML } from '../../../../libs/shared/src/utils/filters';
import { sendPostToQueue } from '../../../../libs/shared/src/messaging/rabbitmq';

export class DiscordPostService {
  private readonly message: Message;
  private readonly channel: Channel;

  constructor(message: Message, channel: Channel) {
    this.message = message;
    this.channel = channel;
  }

  async sendPost() {
    const filteredText = convertDiscordMarkdownToHTML(this.message);
    const medias = this.getMediasFromMessage(this.message);
    const reference = this.message.reference;

    const post: PostPayload = {
      text: filteredText,
      medias,
      messageUrl: reference
        ? `https://discord.com/channels/${reference.guildId}/${reference.channelId}/${reference.messageId}`
        : this.message.url,
      channelType: this.getChannelName(),
    };

    try {
      await sendPostToQueue(this.channel, post);
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

  private getChannelName(): string {
    if (
      this.message.channel.type === ChannelType.GuildText ||
      this.message.channel.type === ChannelType.GuildAnnouncement ||
      this.message.channel.type === ChannelType.PublicThread ||
      this.message.channel.type === ChannelType.PrivateThread
    ) {
      return '#' + this.message.channel.name.replace(/-/g, '');
    }

    return '#other';
  }
}
