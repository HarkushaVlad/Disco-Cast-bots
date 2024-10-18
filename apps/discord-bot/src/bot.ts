import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordPostService } from './services/discordPost.service';
import { config } from '@sot-news-bot/shared';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

export const startBot = () => {
  client.on('messageCreate', async (message) => {
    const discordPostService = new DiscordPostService(message);
    await discordPostService.sendPost();
  });

  client.login(config.discordBotToken);

  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}\n`);
  });
};
