import { Channel, connect } from 'amqplib';
import { config } from '@disco-cast-bot/shared';
import { RABBITMQ_POST_QUEUE_NAME } from '../constants/constants';

export const connectToRabbitMQ = async () => {
  const connection = await connect(config.rabbitMQUrl!);
  const channel = await connection.createChannel();
  await channel.assertQueue(RABBITMQ_POST_QUEUE_NAME, { durable: true });
  return { connection, channel };
};

export const sendPostToQueue = async (channel: Channel, post: any) => {
  channel.sendToQueue(
    RABBITMQ_POST_QUEUE_NAME,
    Buffer.from(JSON.stringify(post)),
    {
      persistent: true,
    }
  );
};
