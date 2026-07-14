/**
 * RabbitMQ Queue Management
 *
 * Handles connection to RabbitMQ and provides publish/consume functionality
 * for the mobile scan job queue. Follows the same pattern as apps/api/src/scanner/queue.ts.
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { logger } from './lib/logger.js';
import type { MobileScanJobMessage } from './types.js';

const MOBILE_SCANS_QUEUE = 'mobile-scan-jobs';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

let rabbitConnection: AmqpConnection | null = null;
let rabbitChannel: AmqpChannel | null = null;

async function ensureRabbitMQ(): Promise<AmqpChannel> {
  if (rabbitChannel) return rabbitChannel;

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(MOBILE_SCANS_QUEUE, { durable: true });

  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    rabbitConnection = null;
    rabbitChannel = null;
  });

  conn.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ connection error');
  });

  logger.info('RabbitMQ connection established for mobile scanner');
  return channel;
}

export async function publishMobileScanJob(message: MobileScanJobMessage): Promise<void> {
  const channel = await ensureRabbitMQ();
  const content = Buffer.from(JSON.stringify(message));

  channel.sendToQueue(MOBILE_SCANS_QUEUE, content, { persistent: true });
  logger.info(
    { scanId: message.scanId, mobileScanId: message.mobileScanId },
    'Mobile scan job published to queue',
  );
}

export async function consumeMobileScanJobs(
  handler: (message: MobileScanJobMessage, ack: () => void, nack: () => void) => Promise<void>,
): Promise<void> {
  const channel = await ensureRabbitMQ();

  await channel.prefetch(1);

  logger.info({ queue: MOBILE_SCANS_QUEUE }, 'Starting to consume mobile scan jobs');

  await channel.consume(MOBILE_SCANS_QUEUE, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString()) as MobileScanJobMessage;

      const ack = () => {
        if (rabbitChannel) {
          rabbitChannel.ack(msg);
        }
      };

      const nack = () => {
        if (rabbitChannel) {
          rabbitChannel.nack(msg, false, false);
        }
      };

      await handler(message, ack, nack);
    } catch (err) {
      logger.error({ err }, 'Failed to process mobile scan job message');
      if (rabbitChannel) {
        rabbitChannel.ack(msg);
      }
    }
  });
}

export async function closeQueue(): Promise<void> {
  try {
    if (rabbitChannel) {
      await rabbitChannel.close();
      rabbitChannel = null;
    }
    if (rabbitConnection) {
      await rabbitConnection.close();
      rabbitConnection = null;
    }
    logger.info('RabbitMQ connection closed');
  } catch (err) {
    logger.warn({ err }, 'Error closing RabbitMQ connection');
  }
}

export function getQueueName(): string {
  return MOBILE_SCANS_QUEUE;
}
