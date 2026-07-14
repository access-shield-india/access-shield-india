import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'apiKey',
      'DATABASE_URL',
      'REDIS_URL',
      'RABBITMQ_URL',
      'KEYCLOAK_ADMIN_CLIENT_SECRET',
      'AUTH_SECRET',
      'AWS_SECRET_ACCESS_KEY',
    ],
    censor: '[REDACTED]',
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});
