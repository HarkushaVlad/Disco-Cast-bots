import 'dotenv/config';
import * as process from 'node:process';

export const config = {
  discordBotToken: process.env['DISCORD_BOT_TOKEN']!,
  discordApplicationId: process.env['DISCORD_APPLICATION_ID']!,
  telegramBotToken: process.env['TELEGRAM_BOT_TOKEN']!,
  telegramServerPort: process.env['TELEGRAM_SERVER_PORT']!,
  rabbitMQUrl: process.env['RABBITMQ_URL']!,
  redisUrl: process.env['REDIS_URL']!,
  redisPort: Number(process.env['REDIS_PORT']!),
} as const;
