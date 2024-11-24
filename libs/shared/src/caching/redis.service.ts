import Redis from 'ioredis';
import { config } from '@disco-cast-bot/shared';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redisUrl,
      port: config.redisPort,
    });
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async set(
    key: string,
    value: string,
    ttlInSeconds?: number
  ): Promise<void> {
    if (ttlInSeconds) {
      await this.client.set(key, value, 'EX', ttlInSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  public async delete(...keys: string[]): Promise<void> {
    for (let key of keys) await this.client.del(key);
  }

  public async flush(): Promise<void> {
    await this.client.flushall();
  }
}

export const redisService = new RedisService();

export const DISCORD_CHANNEL_WITH_TG_IDS_REDIS_KEY = 'discord_channel';

export const DISCORD_GUILD_CHANNELS_REDIS_KEY = 'discord_guild_channels';
