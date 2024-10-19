import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordPostService } from './services/discordPost.service';
import { config } from '@disco-cast-bot/shared';
import { connectToRabbitMQ } from '../../../libs/shared/src/messaging/rabbitmq';
import { Channel, Connection } from 'amqplib';

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
    ({ connection, channel } = await connectToRabbitMQ());
    console.log('Connected to RabbitMQ');

    client.on('messageCreate', async (message) => {
      const discordPostService = new DiscordPostService(message, channel);
      await discordPostService.sendPost();
    });

    client.login(config.discordBotToken);

    client.once('ready', () => {
      console.log(`Logged in as ${client.user?.tag}\n`);
    });

    // Обробка сигналів для закриття
    process.on('SIGINT', closeConnections);
    process.on('SIGTERM', closeConnections);
  } catch (error) {
    console.error('Failed to connect to RabbitMQ', error);
  }
};

const closeConnections = async () => {
  console.log('Closing RabbitMQ connection...');
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
  console.log('RabbitMQ connection closed. Stopping Discord bot...');
  await client.destroy();
  process.exit(0);
};
