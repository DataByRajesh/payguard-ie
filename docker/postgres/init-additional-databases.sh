#!/bin/sh
# Runs once, on first container creation only (postgres's docker-entrypoint-initdb.d convention —
# skipped entirely if the data volume already exists). POSTGRES_DB above provisions payguard_dev;
# this creates the two isolated test databases used by pretest/pretest:e2e, all inside the same
# local-only Postgres instance.
set -e

for db in payguard_vitest payguard_test; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    CREATE DATABASE $db OWNER $POSTGRES_USER;
EOSQL
done
