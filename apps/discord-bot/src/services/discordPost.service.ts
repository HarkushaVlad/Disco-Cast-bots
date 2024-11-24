import { ChannelType, Message } from 'discord.js';
import {
  Medias,
  MediaType,
  PostPayload,
} from '../../../../libs/shared/src/types/post.types';
import { Channel } from 'amqplib';
import { convertDiscordMarkdownToHTML } from '../../../../libs/shared/src/utils/filters';
import { sendPostToQueue } from '../../../../libs/shared/src/messaging/rabbitmq';
import { CachedDiscordChannel } from '../../../../libs/shared/src/types/channel.type';

export class DiscordPostService {
  private readonly channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async sendPost(
    message: Message,
    discordChannel: CachedDiscordChannel
  ): Promise<void> {
    let filteredText: string;
    if (message.reference) {
      filteredText = convertDiscordMarkdownToHTML(
        await message.fetchReference()
      );
    } else {
      filteredText = convertDiscordMarkdownToHTML(message);
    }

    const medias = this.getMediasFromMessage(message);
    const reference = message.reference;

    const post: PostPayload = {
      text: filteredText,
      medias,
      messageUrl: reference
        ? `https://discord.com/channels/${reference.guildId}/${reference.channelId}/${reference.messageId}`
        : message.url,
      channelType: this.getChannelName(message),
      discordChannel,
    };

    if (!post.text && this.areMediasEmpty(post.medias)) {
      console.log(`Message from ${message.channel.id} was empty`);
      return;
    }

    try {
      await sendPostToQueue(this.channel, post);
      console.log(
        `Message from ${message.channel.id} channel was successfully sent`
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

    if (contentType.includes('video') && !contentType.includes('charset')) {
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

  private getChannelName(message: Message): string {
    if (
      message.channel.type === ChannelType.GuildText ||
      message.channel.type === ChannelType.GuildAnnouncement ||
      message.channel.type === ChannelType.PublicThread ||
      message.channel.type === ChannelType.PrivateThread
    ) {
      return '#' + message.channel.name.replace(/-/g, '');
    }

    return '#other';
  }

  private areMediasEmpty(medias: Medias): boolean {
    return Object.values(medias).every((mediaArray) => mediaArray.length === 0);
  }
}
