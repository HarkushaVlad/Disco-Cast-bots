import 'dotenv/config';
import * as process from 'node:process';

export const config = {
  discordBotToken: process.env['DISCORD_BOT_TOKEN']!,
  discordApplicationId: process.env['DISCORD_APPLICATION_ID']!,
  telegramBotToken: process.env['TELEGRAM_BOT_TOKEN']!,
  rabbitMQUrl: process.env['RABBITMQ_URL']!,
  redisUrl: process.env['REDIS_URL']!,
  redisPort: Number(process.env['REDIS_PORT']!),
  logstashPort: Number(process.env['LOGSTASH_PORT']!),
  logstashHost: process.env['LOGSTASH_HOST']!,
} as const;
