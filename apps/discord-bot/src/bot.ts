import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordPostService } from './services/discordPost.service';
import { config } from '@disco-cast-bot/shared';
import { connectToRabbitMQ } from '../../../libs/shared/src/messaging/rabbitmq';
import { Channel, Connection } from 'amqplib';
import { commands } from './commands';
import { deployCommands } from './commands/scripts/deployCommands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let connection: Connection;
let channel: Channel;

export const startBot = async () => {
  try {
    await deployBotCommands();

    await initializeRabbitMQ();

    setUpListeners();

    await client.login(config.discordBotToken);

    handleGracefulShutdown();
  } catch (error) {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  }
};

const deployBotCommands = async () => {
  try {
    await deployCommands();
    console.log('Commands deployed successfully');
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    throw new Error('Command deployment failed');
  }
};

const initializeRabbitMQ = async () => {
  try {
    if (!connection || !channel) {
      ({ connection, channel } = await connectToRabbitMQ());
      console.log('Connected to RabbitMQ');
    }
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw new Error('RabbitMQ connection failed');
  }
};

const setUpListeners = () => {
  client.on('messageCreate', async (message) => {
    const discordPostService = new DiscordPostService(message, channel);
    await discordPostService.sendPost();
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
      await handleCommandInteraction(interaction);
    }
  });

  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}\n`);
  });
};

const handleCommandInteraction = async (interaction: any) => {
  const command = commands.find(
    (cmd) => cmd.data.name === interaction.commandName
  );
  if (command) {
    await command.execute(interaction);
  }
};

const handleGracefulShutdown = () => {
  process.on('SIGINT', closeConnections);
  process.on('SIGTERM', closeConnections);
};

const closeConnections = async () => {
  console.log('Closing RabbitMQ connection...');
  if (channel) await channel.close();
  if (connection) await connection.close();

  console.log('RabbitMQ connection closed. Stopping Discord bot...');
  await client.destroy();

  process.exit(0);
};
