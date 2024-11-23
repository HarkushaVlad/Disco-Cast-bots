import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  CommandInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { prisma } from '../../../telegram-bot/src/services/prismaClient';
import { DiscordChannelConnection } from '../../../../libs/shared/src/types/channelConnection.type';
import {
  MANAGE_COMMAND_CHANNEL_OPTION,
  MANAGE_COMMAND_DELETE_BUTTON_ID,
  MANAGE_COMMAND_HIDE_BUTTON_ID,
  MANAGE_COMMAND_NAME,
  MANAGE_COMMAND_SELECT_CONNECTION_ID,
  MANAGE_COMMAND_UPDATE_BUTTON_ID,
} from '../constants/discordConstants';

interface SelectConnectionValue {
  discordChannelRecordId: string;
  telegramKeyRecordId: string;
}

const getSelectMenu = (connections: DiscordChannelConnection[]) => {
  return new StringSelectMenuBuilder()
    .setCustomId(MANAGE_COMMAND_SELECT_CONNECTION_ID)
    .setPlaceholder('Select a connection to manage')
    .addOptions(
      connections.flatMap((conn) =>
        conn.uniqueKeys.map((key) => ({
          label: `#${conn.name}`,
          description: `Telegram: ${
            key?.description.slice(0, 20) || 'No description'
          }`,
          value: JSON.stringify({
            discordChannelRecordId: conn.id,
            telegramKeyRecordId: key?.id,
          }),
        }))
      )
    );
};

const getDiscordChannelConnections = async (
  guildId: string,
  channelId?: string
): Promise<DiscordChannelConnection[]> => {
  try {
    if (channelId) {
      return [
        await prisma.discordChannel.findFirst({
          where: {
            discordChannelId: channelId,
            discordGuildId: guildId,
            uniqueKeys: {
              some: {},
            },
          },
          include: { uniqueKeys: true },
        }),
      ];
    }

    return prisma.discordChannel.findMany({
      where: {
        discordGuildId: guildId,
        uniqueKeys: {
          some: {},
        },
      },
      include: { uniqueKeys: true },
    });
  } catch (error) {
    console.error('Error retrieving connections:', error);
    throw new Error('Unable to retrieve channel connections');
  }
};

export const manageCommand = {
  data: new SlashCommandBuilder()
    .setName(MANAGE_COMMAND_NAME)
    .setDescription('Manage connections between Discord and Telegram')
    .addChannelOption((option) =>
      option
        .setName(MANAGE_COMMAND_CHANNEL_OPTION)
        .setDescription(
          'Select a specific channel to manage connections (optional)'
        )
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction: CommandInteraction): Promise<void> {
    const channel = interaction.options.get(
      MANAGE_COMMAND_CHANNEL_OPTION
    )?.channel;

    try {
      const connections = await getDiscordChannelConnections(
        interaction.guild.id,
        channel?.id
      );

      if (!connections || connections.length === 0) {
        await interaction.reply({
          content: `❌ No connections found for ${
            channel ? `<#${channel.id}>` : 'this server'
          }. To add one, use the /cast command.`,
          ephemeral: true,
        });
        return;
      }

      const selectMenu = getSelectMenu(connections);

      const menuRow =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu
        );

      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(MANAGE_COMMAND_HIDE_BUTTON_ID)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(
            `${MANAGE_COMMAND_UPDATE_BUTTON_ID}&${channel ? channel.id : ''}`
          )
          .setLabel('Update')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        content: `Select a connection ${
          channel ? `for <#${channel.id}>` : ''
        } to view details:`,
        components: [menuRow, buttonsRow],
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Error occurred while retrieving connections. Please try again later.`,
        ephemeral: true,
      });
    }
  },

  async handleSelectChannelInteraction(
    interaction: StringSelectMenuInteraction
  ): Promise<void> {
    try {
      const selectedConnection: SelectConnectionValue = JSON.parse(
        interaction.values[0]
      );

      const selectedDiscordChannelRecordId = Number(
        selectedConnection.discordChannelRecordId
      );
      const selectedTelegramKeyChannelRecordId = Number(
        selectedConnection.telegramKeyRecordId
      );

      if (
        isNaN(selectedDiscordChannelRecordId) ||
        isNaN(selectedTelegramKeyChannelRecordId)
      ) {
        await interaction.reply({
          content: '❌ Invalid or deprecated connection',
          ephemeral: true,
        });
        return;
      }

      const connection: DiscordChannelConnection =
        await prisma.discordChannel.findFirst({
          where: {
            id: selectedDiscordChannelRecordId,
            uniqueKeys: {
              some: {
                id: selectedTelegramKeyChannelRecordId,
              },
            },
          },
          include: {
            uniqueKeys: true,
          },
        });

      if (!connection) {
        await interaction.reply({
          content: '❌ Connection not found.',
          ephemeral: true,
        });
        return;
      }

      const connectionDetails = `
**Connection Details**:
- Channel: <#${connection.discordChannelId}>
- Telegram channel Description: ${
        connection.uniqueKeys[0]?.description || 'No description available'
      }
- Telegram channel ID: ${
        connection.uniqueKeys[0]?.telegramChannelId || 'No id available'
      }
`;

      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(MANAGE_COMMAND_HIDE_BUTTON_ID)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(
            `${MANAGE_COMMAND_DELETE_BUTTON_ID}&${connection.id}&${connection.uniqueKeys[0].id}`
          )
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        content: connectionDetails,
        ephemeral: true,
        components: [buttonsRow],
      });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to fetch connection details.',
        ephemeral: true,
      });
      console.error(error);
    }
  },

  async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const [action, firstButtonArg, secondButtonArg] =
      interaction.customId.split('&');

    try {
      if (action === MANAGE_COMMAND_HIDE_BUTTON_ID) {
        await interaction.deferUpdate();
        await interaction.deleteReply();
        return;
      }

      if (action === MANAGE_COMMAND_UPDATE_BUTTON_ID) {
        await interaction.deferUpdate();

        const connections = await getDiscordChannelConnections(
          interaction.guild.id,
          firstButtonArg
        );

        if (!connections || connections.length === 0) {
          await interaction.reply({
            content: `❌ No connections found for ${
              firstButtonArg ? `<#${firstButtonArg}>` : 'this server'
            }. To add one, use the /cast command.`,
            ephemeral: true,
          });
          return;
        }

        const selectMenu = getSelectMenu(connections);

        const menuRow =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu
          );

        const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(MANAGE_COMMAND_HIDE_BUTTON_ID)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(
              `${MANAGE_COMMAND_UPDATE_BUTTON_ID}&${
                firstButtonArg ? firstButtonArg : ''
              }`
            )
            .setLabel('Update')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
          content: `Select a connection ${
            firstButtonArg ? `for <#${firstButtonArg}>` : ''
          } to view details:`,
          components: [menuRow, buttonsRow],
        });

        return;
      }

      if (
        action === MANAGE_COMMAND_DELETE_BUTTON_ID &&
        firstButtonArg &&
        secondButtonArg
      ) {
        await interaction.deferUpdate();

        const convertedDiscordChannelId = Number(firstButtonArg);
        const convertedTelegramKeyId = Number(secondButtonArg);

        if (isNaN(convertedDiscordChannelId) || isNaN(convertedTelegramKeyId)) {
          await interaction.editReply({
            content: '❌ Invalid or deprecated connection',
            components: [],
          });
          return;
        }

        await prisma.discordChannel.update({
          where: {
            id: convertedDiscordChannelId,
          },
          data: {
            uniqueKeys: {
              disconnect: {
                id: convertedTelegramKeyId,
              },
            },
          },
        });

        const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(MANAGE_COMMAND_HIDE_BUTTON_ID)
            .setLabel('Hide')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({
          content: `✅ Connection has been deleted.`,
          components: [buttonsRow],
        });

        return;
      }

      await interaction.deleteReply();
    } catch (error) {
      await interaction.editReply({
        content: '❌ An error occurred while processing your request.',
        components: [],
      });
      console.error(error);
    }
  },
};
