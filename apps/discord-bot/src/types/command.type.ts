import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js';

export type DiscordCommand = {
  data: SlashCommandOptionsOnlyBuilder;
  execute(interaction: CommandInteraction): Promise<void>;
};
