import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { config } from '@sot-news-bot/shared';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', (message) => {
  // const discordPostService = new DiscordPostService(message);
  // discordPostService.sendPost();
});

client.login(config.discordBotToken);
