#!/usr/bin/env bash
set -euo pipefail
for attempt in $(seq 1 60); do
  if mongosh --host mongodb:27017 --quiet --username admin \
    --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
    --file /workflow/init-replica.js; then
    exit 0
  fi
  sleep 2
done
echo "Replica set initialization failed; workflow must remain disabled." >&2
exit 1
