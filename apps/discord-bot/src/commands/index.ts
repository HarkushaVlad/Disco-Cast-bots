import { castCommand } from './cast';
import { manageCommand } from './manage';
import { DiscordCommand } from '../types/command.type';

export const commands: DiscordCommand[] = [castCommand, manageCommand];
