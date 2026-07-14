import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      'apiKey',
      'DATABASE_URL',
      'REDIS_URL',
      'RABBITMQ_URL',
      'BROWSERSTACK_USERNAME',
      'BROWSERSTACK_ACCESS_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ],
    censor: '[REDACTED]',
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});
