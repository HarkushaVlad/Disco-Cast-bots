import { REST, Routes } from 'discord.js';
import { config } from '@disco-cast-bot/shared';
import { commands } from '../index';

const rest = new REST({ version: '10' }).setToken(config.discordBotToken);

export const deployCommands = async () => {
  const commandData = commands.map((cmd) => cmd.data.toJSON());

  const res = await rest.put(
    Routes.applicationCommands(config.discordApplicationId),
    {
      body: commandData,
    }
  );
};
