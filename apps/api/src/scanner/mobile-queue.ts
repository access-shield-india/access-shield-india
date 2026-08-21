/**
 * RabbitMQ publisher for mobile scan jobs.
 */

import amqp from 'amqplib';
import { logger } from '../lib/logger';

const MOBILE_SCANS_QUEUE = 'mobile-scan-jobs';

export interface MobileScanJobMessage {
  scanId: string;
  mobileScanId: string;
  mobileAppId: string;
  orgId: string;
  assetId: string;
  platform: 'android' | 'ios';
  apkS3Key?: string;
  ipaS3Key?: string;
  bundleId?: string;
  config: {
    standards: Array<'WCAG22' | 'IS17802' | 'GIGW3' | 'SEBI'>;
    maxScreens: number;
  };
}

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

  await channel.assertQueue(MOBILE_SCANS_QUEUE, { durable: true });

  conn.on('close', () => {
    logger.warn('RabbitMQ mobile queue connection closed');
    rabbitConnection = null;
    rabbitChannel = null;
  });

  conn.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ mobile queue connection error');
  });

  return channel;
}

export async function publishMobileScanJob(message: MobileScanJobMessage): Promise<void> {
  const channel = await ensureRabbitMQ();
  const content = Buffer.from(JSON.stringify(message));

  channel.sendToQueue(MOBILE_SCANS_QUEUE, content, { persistent: true });
  logger.info(
    { scanId: message.scanId, assetId: message.assetId, platform: message.platform },
    'Mobile scan job published to queue',
  );
}
