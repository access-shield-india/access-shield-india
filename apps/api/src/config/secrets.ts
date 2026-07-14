import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export interface AppSecrets {
  databaseUrl: string;
  redisUrl: string;
  rabbitmqUrl: string;
  authIssuerUrl: string;
  authJwksUrl?: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakAdminClientId: string;
  keycloakAdminClientSecret: string;
}

const REQUIRED_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'RABBITMQ_URL',
  'AUTH_ISSUER_URL',
  'KEYCLOAK_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_ADMIN_CLIENT_ID',
  'KEYCLOAK_ADMIN_CLIENT_SECRET',
] as const;

function mapFromRecord(source: Record<string, string | undefined>): AppSecrets {
  return {
    databaseUrl: source['DATABASE_URL']!,
    redisUrl: source['REDIS_URL']!,
    rabbitmqUrl: source['RABBITMQ_URL']!,
    authIssuerUrl: source['AUTH_ISSUER_URL']!,
    authJwksUrl: source['AUTH_JWKS_URL'],
    keycloakUrl: source['KEYCLOAK_URL']!,
    keycloakRealm: source['KEYCLOAK_REALM']!,
    keycloakAdminClientId: source['KEYCLOAK_ADMIN_CLIENT_ID']!,
    keycloakAdminClientSecret: source['KEYCLOAK_ADMIN_CLIENT_SECRET']!,
  };
}

function fromEnv(): AppSecrets {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return mapFromRecord(process.env as Record<string, string | undefined>);
}

async function fromAwsSecretsManager(secretId: string, region: string): Promise<AppSecrets> {
  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} has no string value`);
  }

  const parsed = JSON.parse(response.SecretString) as Record<string, string>;
  const missing = REQUIRED_KEYS.filter((key) => !parsed[key]);
  if (missing.length > 0) {
    throw new Error(`AWS secret missing keys: ${missing.join(', ')}`);
  }

  return mapFromRecord(parsed);
}

/**
 * Load secrets at startup.
 * Local dev: .env.local via dotenv. Production: AWS Secrets Manager.
 */
export async function loadSecrets(): Promise<AppSecrets> {
  const isProduction = process.env.NODE_ENV === 'production';
  const secretId = process.env.AWS_SECRET_ID;
  const region = process.env.AWS_REGION ?? 'ap-south-1';

  if (isProduction && secretId) {
    return fromAwsSecretsManager(secretId, region);
  }

  return fromEnv();
}
