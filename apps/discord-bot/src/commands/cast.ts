import {
  CommandInteraction,
  GuildBasedChannel,
  MessageComponentInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { prisma } from '../../../telegram-bot/src/services/prismaClient';

export const castCommand = {
  data: new SlashCommandBuilder()
    .setName('cast')
    .setDescription(
      'Cast a message from a selected text channel to a Telegram channel'
    )
    .addStringOption((option) =>
      option
        .setName('telegramkey')
        .setDescription('The Telegram unique key to link with Discord channel')
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction): Promise<void> {
    const telegramKey = interaction.options.get('telegramkey').value as string;

    if (!telegramKey || telegramKey.length !== 16) {
      await interaction.reply({
        content: '❌ Please provide a valid Telegram key.',
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

    const guild = interaction.guild;
    const textChannels = guild.channels.cache.filter(
      (channel: GuildBasedChannel) => channel.type === 0
    );

    if (textChannels.size === 0) {
      await interaction.reply({
        content: '❌ No text channels available in this server.',
        ephemeral: true,
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_channel')
      .setPlaceholder('Select a text channel')
      .addOptions(
        textChannels.map((channel: GuildBasedChannel) => ({
          label: channel.name,
          value: channel.id,
        }))
      );

    await interaction.reply({
      content: `Please select a text channel to link with the Telegram key (${telegramKeyRecord.description})`,
      components: [
        {
          type: 1,
          components: [selectMenu],
        },
      ],
      ephemeral: true,
    });

    const filter = (i: MessageComponentInteraction) =>
      i.customId === 'select_channel' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on('collect', async (i) => {
      if (!i.isStringSelectMenu()) return;
      const selectedChannelId = i.values[0];
      const selectedChannel = guild.channels.cache.get(selectedChannelId);

      const existingConnection = await prisma.discordChannel.findFirst({
        where: {
          discordChannelId: selectedChannelId,
          uniqueKeys: {
            some: { telegramChannelId: telegramKeyRecord.telegramChannelId },
          },
        },
      });

      if (existingConnection) {
        await i.reply({
          content: `✅ <#${selectedChannel.id}> is already linked to the Telegram channel with key: ${telegramKey}`,
          ephemeral: true,
        });
        collector.stop();
        return;
      }

      await prisma.discordChannel.create({
        data: {
          discordChannelId: selectedChannelId,
          discordGuildId: guild.id,
          name: selectedChannel.name,
          uniqueKeys: {
            connect: {
              telegramChannelId: telegramKeyRecord.telegramChannelId,
            },
          },
        },
      });

      await i.reply({
        content: `✅ Successfully linked <#${selectedChannel.id}> with the Telegram channel (${telegramKeyRecord.description})!`,
        ephemeral: true,
      });
      collector.stop();
    });
  },
};

export type DiscordCommand = typeof castCommand;
