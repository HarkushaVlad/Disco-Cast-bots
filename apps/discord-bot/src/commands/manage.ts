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
import {
  MANAGE_COMMAND_CHANNEL_HASHTAG_BUTTON_ID,
  MANAGE_COMMAND_CHANNEL_OPTION,
  MANAGE_COMMAND_CREDITS_BUTTON_ID,
  MANAGE_COMMAND_DELETE_BUTTON_ID,
  MANAGE_COMMAND_HIDE_BUTTON_ID,
  MANAGE_COMMAND_NAME,
  MANAGE_COMMAND_SELECT_CONNECTION_ID,
  MANAGE_COMMAND_SOURCE_BUTTON_ID,
  MANAGE_COMMAND_UPDATE_BUTTON_ID,
} from '../constants/discordConstants';
import {
  DISCORD_GUILD_CHANNELS_REDIS_KEY,
  redisService,
} from '../../../../libs/shared/src/caching/redis.service';
import { ExtendedChannelsLink } from '../../../../libs/shared/src/types/channel.type';

interface SelectLinkValue {
  discordChannelRecordId: string;
  telegramKeyRecordId: string;
}

const getSelectMenu = (connections: ExtendedChannelsLink[]) => {
  return new StringSelectMenuBuilder()
    .setCustomId(MANAGE_COMMAND_SELECT_CONNECTION_ID)
    .setPlaceholder('Select a connection to manage')
    .addOptions(
      connections.map((extendedLink) => {
        return {
          label: `#${extendedLink.discordChannel.name}`,
          description: `Telegram: ${extendedLink.telegramKey.description.slice(
            0,
            20
          )}`,
          value: JSON.stringify({
            discordChannelRecordId: extendedLink.discordChannel.id,
            telegramKeyRecordId: extendedLink.telegramKey.id,
          }),
        };
      })
    );
};

const getExtendedChannelsLinks = async (
  discordGuildId: string,
  discordChannelId?: string
): Promise<ExtendedChannelsLink[]> => {
  try {
    if (discordChannelId) {
      return prisma.channelsLink.findMany({
        where: {
          discordChannel: {
            discordChannelId: discordChannelId,
          },
        },
        include: {
          telegramKey: true,
          discordChannel: true,
        },
      });
    }

    return prisma.channelsLink.findMany({
      where: {
        discordChannel: {
          guild: {
            discordGuildId: discordGuildId,
          },
        },
      },
      include: {
        telegramKey: true,
        discordChannel: true,
      },
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
      const connections = await getExtendedChannelsLinks(
        interaction.guild.id,
        channel?.id
      );

      if (!connections || connections.length === 0) {
        await interaction.reply({
          content: `❌ No links found for ${
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
        generateButton(
          MANAGE_COMMAND_HIDE_BUTTON_ID,
          'Cancel',
          ButtonStyle.Secondary
        ),
        generateButton(
          `${MANAGE_COMMAND_UPDATE_BUTTON_ID}&${channel ? channel.id : ''}`,
          'Update',
          ButtonStyle.Primary
        )
      );

      await interaction.reply({
        content: `Select a link ${
          channel ? `for <#${channel.id}>` : ''
        } to view details:`,
        components: [menuRow, buttonsRow],
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Error occurred while retrieving links. Please try again later.`,
        ephemeral: true,
      });
    }
  },

  async handleSelectChannelInteraction(
    interaction: StringSelectMenuInteraction
  ): Promise<void> {
    try {
      const selectedConnection: SelectLinkValue = JSON.parse(
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
          content: '❌ Invalid or deprecated link',
          ephemeral: true,
        });
        return;
      }

      const link: ExtendedChannelsLink = await prisma.channelsLink.findFirst({
        where: {
          discordChannelRecordId: selectedDiscordChannelRecordId,
          telegramKeyRecordId: selectedTelegramKeyChannelRecordId,
        },
        include: {
          telegramKey: true,
          discordChannel: true,
        },
      });

      if (!link) {
        await interaction.reply({
          content: '❌ Link not found.',
          ephemeral: true,
        });
        return;
      }

      const connectionDetails = `
**Link Details**:
- Channel: <#${link.discordChannelRecordId}>
- Telegram channel Description: ${
        link.telegramKey.description || 'No description available'
      }
- Telegram channel ID: ${
        link.telegramKey.telegramChannelId || 'No id available'
      }
`;

      const manageButtonsRow = getManageButtonsRow(link);

      await interaction.reply({
        content: connectionDetails,
        ephemeral: true,
        components: [manageButtonsRow],
      });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to fetch link details.',
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

      if (action === MANAGE_COMMAND_SOURCE_BUTTON_ID) {
        await interaction.deferUpdate();

        const convertedLinkId = Number(firstButtonArg);
        const currentWithSource = secondButtonArg === 'true';

        if (isNaN(convertedLinkId)) {
          await interaction.editReply({
            content: '❌ Invalid or deprecated link',
            components: [],
          });
          return;
        }

        try {
          const updatedLink = await prisma.channelsLink.update({
            where: {
              id: convertedLinkId,
            },
            data: {
              withSource: !currentWithSource,
            },
            include: {
              telegramKey: true,
              discordChannel: true,
            },
          });

          const manageButtonsRow = getManageButtonsRow(updatedLink);

          await interaction.editReply({
            content: interaction.message.content,
            components: [manageButtonsRow],
          });
        } catch (error) {
          console.error('Error updating withSource:', error);
          await interaction.editReply({
            content: '❌ Failed to update the link. Please try again later.',
            components: [],
          });
        }
        return;
      }

      if (action === MANAGE_COMMAND_CHANNEL_HASHTAG_BUTTON_ID) {
        await interaction.deferUpdate();

        const convertedLinkId = Number(firstButtonArg);
        const currentWithHashtag = secondButtonArg === 'true';

        if (isNaN(convertedLinkId)) {
          await interaction.editReply({
            content: '❌ Invalid or deprecated link',
            components: [],
          });
          return;
        }

        try {
          const updatedLink = await prisma.channelsLink.update({
            where: {
              id: convertedLinkId,
            },
            data: {
              withHashtag: !currentWithHashtag,
            },
            include: {
              telegramKey: true,
              discordChannel: true,
            },
          });

          const manageButtonsRow = getManageButtonsRow(updatedLink);

          await interaction.editReply({
            content: interaction.message.content,
            components: [manageButtonsRow],
          });
        } catch (error) {
          console.error('Error updating withHashtag:', error);
          await interaction.editReply({
            content: '❌ Failed to update the link. Please try again later.',
            components: [],
          });
        }
        return;
      }

      if (action === MANAGE_COMMAND_CREDITS_BUTTON_ID) {
        await interaction.deferUpdate();

        const convertedLinkId = Number(firstButtonArg);
        const currentWithMention = secondButtonArg === 'true';

        if (isNaN(convertedLinkId)) {
          await interaction.editReply({
            content: '❌ Invalid or deprecated link',
            components: [],
          });
          return;
        }

        try {
          const updatedLink = await prisma.channelsLink.update({
            where: {
              id: convertedLinkId,
            },
            data: {
              withMention: !currentWithMention,
            },
            include: {
              telegramKey: true,
              discordChannel: true,
            },
          });

          const manageButtonsRow = getManageButtonsRow(updatedLink);

          await interaction.editReply({
            content: interaction.message.content,
            components: [manageButtonsRow],
          });
        } catch (error) {
          console.error('Error updating withMention:', error);
          await interaction.editReply({
            content: '❌ Failed to update the link. Please try again later.',
            components: [],
          });
        }
        return;
      }

      if (action === MANAGE_COMMAND_UPDATE_BUTTON_ID) {
        await interaction.deferUpdate();

        const links = await getExtendedChannelsLinks(
          interaction.guild.id,
          firstButtonArg
        );

        if (!links || links.length === 0) {
          await interaction.reply({
            content: `❌ No links found for ${
              firstButtonArg ? `<#${firstButtonArg}>` : 'this server'
            }. To add one, use the /cast command.`,
            ephemeral: true,
          });
          return;
        }

        const selectMenu = getSelectMenu(links);

        const menuRow =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu
          );

        const menuButtonsRow =
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            generateButton(
              MANAGE_COMMAND_HIDE_BUTTON_ID,
              'Cancel',
              ButtonStyle.Secondary
            ),
            generateButton(
              `${MANAGE_COMMAND_UPDATE_BUTTON_ID}&${
                firstButtonArg ? firstButtonArg : ''
              }`,
              'Update',
              ButtonStyle.Primary
            )
          );

        await interaction.editReply({
          content: `Select a link ${
            firstButtonArg ? `for <#${firstButtonArg}>` : ''
          } to view details:`,
          components: [menuRow, menuButtonsRow],
        });

        return;
      }

      if (action === MANAGE_COMMAND_DELETE_BUTTON_ID && firstButtonArg) {
        await interaction.deferUpdate();

        const convertedLinkId = Number(firstButtonArg);

        if (isNaN(convertedLinkId)) {
          await interaction.editReply({
            content: '❌ Invalid or deprecated link',
            components: [],
          });
          return;
        }

        await prisma.channelsLink.delete({
          where: {
            id: convertedLinkId,
          },
        });

        await redisService.delete(
          `${DISCORD_GUILD_CHANNELS_REDIS_KEY}:${interaction.guild.id}`
        );

        const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          generateButton(
            `${MANAGE_COMMAND_HIDE_BUTTON_ID}`,
            'Hide',
            ButtonStyle.Secondary
          )
        );

        await interaction.editReply({
          content: `✅ Channels was unlink.`,
          components: [buttonsRow],
        });

        return;
      }

      await interaction.deleteReply();
    } catch (error) {
      console.error('Error handling manage button:', error);
      await interaction.editReply({
        content: '❌ An error occurred while processing your request.',
        components: [],
      });
    }
  },
};

const generateButton = (
  id: string,
  label: string,
  style: ButtonStyle,
  isActive?: boolean
) => {
  const button = new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style);
  if (isActive !== undefined) {
    button.setLabel(`${isActive ? '✅' : '❌'} ${label}`);
    button.setStyle(isActive ? ButtonStyle.Success : ButtonStyle.Secondary);
  }
  return button;
};

const getManageButtonsRow = (extendedLink: ExtendedChannelsLink) => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    generateButton(
      MANAGE_COMMAND_HIDE_BUTTON_ID,
      'Cancel',
      ButtonStyle.Secondary
    ),
    generateButton(
      `${MANAGE_COMMAND_SOURCE_BUTTON_ID}&${extendedLink.id}&${extendedLink.withSource}`,
      'Show source',
      ButtonStyle.Secondary,
      extendedLink.withSource
    ),
    generateButton(
      `${MANAGE_COMMAND_CHANNEL_HASHTAG_BUTTON_ID}&${extendedLink.id}&${extendedLink.withHashtag}`,
      'Show channel hashtag',
      ButtonStyle.Secondary,
      extendedLink.withHashtag
    ),
    generateButton(
      `${MANAGE_COMMAND_CREDITS_BUTTON_ID}&${extendedLink.id}&${extendedLink.withMention}`,
      'Show credits',
      ButtonStyle.Secondary,
      extendedLink.withMention
    ),
    generateButton(
      `${MANAGE_COMMAND_DELETE_BUTTON_ID}&${extendedLink.id}`,
      'Delete',
      ButtonStyle.Danger
    )
  );
};
