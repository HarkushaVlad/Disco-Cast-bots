import {
  ChannelType,
  CommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { prisma } from '../../../telegram-bot/src/services/prismaClient';
import { DiscordChannel, TelegramKey } from '@prisma/client';
import {
  CAST_COMMAND_CHANNEL_OPTION,
  CAST_COMMAND_NAME,
  CAST_COMMAND_TELEGRAM_KEY_OPTION,
} from '../constants/discordConstants';
import {
  DISCORD_CHANNEL_WITH_TG_IDS_REDIS_KEY,
  redisService,
} from '../../../../libs/shared/src/caching/redis.service';

export const castCommand = {
  data: new SlashCommandBuilder()
    .setName(CAST_COMMAND_NAME)
    .setDescription(
      'Cast a message from a selected text channel to a Telegram channel'
    )
    .addStringOption((option) =>
      option
        .setName(CAST_COMMAND_TELEGRAM_KEY_OPTION)
        .setDescription('The Telegram unique key to link with Discord channel')
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName(CAST_COMMAND_CHANNEL_OPTION)
        .setDescription('The Discord text channel to cast the message from')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction: CommandInteraction): Promise<void> {
    const telegramKey = interaction.options.get(
      CAST_COMMAND_TELEGRAM_KEY_OPTION
    ).value as string;
    const discordChannel = interaction.options.get('channel').channel;

    if (!telegramKey || telegramKey.length !== 16) {
      await interaction.reply({
        content:
          '❌ Please provide a valid Telegram key or create a new one in [Telegram bot](https://t.me/discoCastBot).',
        ephemeral: true,
      });
      return;
    }

    const telegramKeyRecord = await prisma.telegramKey.findUnique({
      where: { uniqueKey: telegramKey },
    });

    if (!telegramKeyRecord) {
      await interaction.reply({
        content:
          '❌ The Telegram key you provided does not exist. Please try again with a valid key or create a new one in [Telegram bot](https://t.me/discoCastBot).',
        ephemeral: true,
      });
      return;
    }

    const existingChannelRecord = await prisma.discordChannel.findUnique({
      where: {
        discordChannelId: discordChannel.id,
      },
    });

    let discordChannelRecord: DiscordChannel;
    if (!existingChannelRecord) {
      const discordGuildId = interaction.guild.id;
      const discordGuildName = interaction.guild.name;

      let discordGuildRecord = await prisma.discordGuild.findUnique({
        where: { discordGuildId },
      });

      if (!discordGuildRecord) {
        discordGuildRecord = await prisma.discordGuild.create({
          data: {
            discordGuildId,
            name: discordGuildName,
          },
        });
      }

      discordChannelRecord = await prisma.discordChannel.create({
        data: {
          guildId: discordGuildRecord.id,
          discordChannelId: discordChannel.id,
          name: discordChannel.name,
        },
      });
    } else {
      discordChannelRecord = existingChannelRecord;
    }

    const existingConnection: TelegramKey = await prisma.telegramKey.findFirst({
      where: {
        id: telegramKeyRecord.id,
        discordChannels: {
          some: { id: discordChannelRecord.id },
        },
      },
    });

    if (existingConnection) {
      await interaction.reply({
        content: `✅ <#${discordChannel.id}> is already linked to the Telegram channel (${telegramKeyRecord.description})`,
        ephemeral: true,
      });
    } else {
      await prisma.discordChannel.update({
        where: {
          id: discordChannelRecord.id,
        },
        data: {
          uniqueKeys: {
            connect: { id: telegramKeyRecord.id },
          },
        },
      });

      await redisService.delete(
        `${DISCORD_CHANNEL_WITH_TG_IDS_REDIS_KEY}:${discordChannelRecord.discordChannelId}`
      );

      await interaction.reply({
        content: `✅ Successfully linked <#${discordChannel.id}> with the Telegram channel (${telegramKeyRecord.description})!`,
        ephemeral: true,
      });
    }
  },
};
