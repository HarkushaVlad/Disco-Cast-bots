import { Channel, connect } from 'amqplib';
import { config } from '@disco-cast-bot/shared';
import { RABBITMQ_POST_QUEUE_NAME } from '../constants/constants';
import { PostPayload } from '../types/post.types';
import { safeJSONStringify } from '../utils/utils';

export const connectToRabbitMQ = async () => {
  const channelModel = await connect(config.rabbitMQUrl!);
  const channel = await channelModel.createChannel();
  await channel.assertQueue(RABBITMQ_POST_QUEUE_NAME, { durable: true });
  return { channelModel, channel };
};

export const sendPostToQueue = async (channel: Channel, post: PostPayload) => {
  channel.sendToQueue(
    RABBITMQ_POST_QUEUE_NAME,
    Buffer.from(safeJSONStringify(post)),
    {
      persistent: true,
    }
  );
};
