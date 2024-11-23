import {
  ButtonInteraction,
  Client,
  CommandInteraction,
  GatewayIntentBits,
  Message,
  StringSelectMenuInteraction,
} from 'discord.js';
import { DiscordPostService } from './services/discordPost.service';
import { config } from '@disco-cast-bot/shared';
import { connectToRabbitMQ } from '../../../libs/shared/src/messaging/rabbitmq';
import { Channel, Connection } from 'amqplib';
import { commands } from './commands';
import { deployCommands } from './commands/scripts/deployCommands';
import { manageCommand } from './commands/manage';
import {
  ALL_MANAGE_COMMAND_BUTTON_IDS,
  MANAGE_COMMAND_SELECT_CONNECTION_ID,
} from './constants/discordConstants';
import { prisma } from '../../telegram-bot/src/services/prismaClient';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let rabbitConnection: Connection;
let rabbitChannel: Channel;
let discordPostService: DiscordPostService;

export const startBot = async () => {
  try {
    await deployBotCommands();
    await initializeRabbitMQ();
    setUpListeners();
    discordPostService = new DiscordPostService(rabbitChannel);
    await client.login(config.discordBotToken);
    handleGracefulShutdown();
  } catch (error) {
    console.error('Failed to start the bot', error);
  }
};

const deployBotCommands = async () => {
  try {
    await deployCommands();
    console.log('Commands deployed successfully');
  } catch (error) {
    console.error('Failed to deploy commands', error);
  }
};

const initializeRabbitMQ = async () => {
  try {
    if (!rabbitConnection || !rabbitChannel) {
      ({ connection: rabbitConnection, channel: rabbitChannel } =
        await connectToRabbitMQ());
      console.log('Connected to RabbitMQ');
    }
  } catch (error) {
    console.error('Failed to connect to RabbitMQ', error);
  }
};

const setUpListeners = () => {
  client.on('messageCreate', handleMessageCreate);
  client.on('interactionCreate', handleInteractionCreate);
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}\n`);
  });
};

const handleMessageCreate = async (message: Message) => {
  try {
    const existingDiscordChannelRecord = await prisma.discordChannel.findUnique(
      {
        where: {
          discordGuildId_discordChannelId: {
            discordGuildId: message.guild.id,
            discordChannelId: message.channel.id,
          },
        },
      }
    );

    if (existingDiscordChannelRecord) {
      await discordPostService.sendPost(
        message,
        existingDiscordChannelRecord.id
      );
    }
  } catch (error) {
    console.error('Error handling messageCreate event', error);
  }
};

const handleInteractionCreate = async (interaction: any) => {
  try {
    if (interaction.isCommand()) {
      await handleCommandInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleStringSelectInteraction(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    console.error('Error handling interactionCreate event', error);
  }
};

const handleCommandInteraction = async (interaction: CommandInteraction) => {
  const command = commands.find(
    (cmd) => cmd.data.name === interaction.commandName
  );
  if (command) {
    await command.execute(interaction);
  } else {
    await interaction.reply({ content: 'Unknown command', ephemeral: true });
  }
};

const handleStringSelectInteraction = async (
  interaction: StringSelectMenuInteraction
) => {
  try {
    switch (interaction.customId) {
      case MANAGE_COMMAND_SELECT_CONNECTION_ID:
        await manageCommand.handleSelectChannelInteraction(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Invalid selection!',
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error('Error handling string select interaction', error);
  }
};

const handleButtonInteraction = async (interaction: ButtonInteraction) => {
  const action = interaction.customId.split('&')[0];
  if (ALL_MANAGE_COMMAND_BUTTON_IDS.includes(action)) {
    await manageCommand.handleButtonInteraction(interaction);
  } else {
    await interaction.reply({
      content: 'Unknown action.',
      ephemeral: true,
    });
  }
};

const handleGracefulShutdown = () => {
  process.on('SIGINT', closeConnections);
  process.on('SIGTERM', closeConnections);
};

const closeConnections = async () => {
  console.log('Closing RabbitMQ connection...');
  try {
    if (rabbitChannel) await rabbitChannel.close();
    if (rabbitConnection) await rabbitConnection.close();
    console.log('RabbitMQ connection closed.');
  } catch (error) {
    console.error('Error closing RabbitMQ connection', error);
  }

  console.log('Stopping Discord bot...');
  await client.destroy();
  process.exit(0);
};
