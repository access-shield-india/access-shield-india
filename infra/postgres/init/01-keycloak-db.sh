#!/bin/bash
# Runs only on first Postgres data-dir init (empty volume).
# Creates a dedicated Keycloak database on the same instance as AccessShield.
# App schema stays in POSTGRES_DB=accessshield — never share that database with Keycloak.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'keycloak') THEN
      CREATE ROLE keycloak LOGIN PASSWORD 'keycloak';
    END IF;
  END
  \$\$;

  SELECT 'CREATE DATABASE keycloak OWNER keycloak'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

  GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
EOSQL

# Keycloak 26+ needs CREATE on schema public when not superuser
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname keycloak <<-EOSQL
  GRANT ALL ON SCHEMA public TO keycloak;
  ALTER DATABASE keycloak OWNER TO keycloak;
EOSQL
