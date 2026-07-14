/**
 * RabbitMQ scan job publisher — shared by authenticated and public scan routes.
 */

import amqp from 'amqplib';
import { logger } from '../lib/logger';
import type { ScanJobMessage } from './types';

const SCANS_QUEUE = 'scans';

let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let rabbitChannel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createChannel']>
> | null = null;

async function ensureRabbitMQ() {
  if (rabbitChannel) return rabbitChannel;

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCANS_QUEUE, { durable: true });

  conn.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    rabbitConnection = null;
    rabbitChannel = null;
  });

  conn.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ connection error');
  });

  return channel;
}

/** Publish a scan job to the durable scans queue. */
export async function publishScanJob(message: ScanJobMessage): Promise<void> {
  const channel = await ensureRabbitMQ();
  const content = Buffer.from(JSON.stringify(message));

  channel.sendToQueue(SCANS_QUEUE, content, { persistent: true });
  logger.info({ scanId: message.scanId, assetId: message.assetId }, 'Scan job published to queue');
}

/** Close RabbitMQ connection on shutdown. */
export async function closeScanQueue(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close();
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close();
    rabbitConnection = null;
  }
}
