#!/bin/sh
set -e

BROKER="kafka:19092"
PARTITIONS=3
REPLICATION=1
RETENTION_MS=604800000  # 7 días

TOPICS="activation.requested billing.events provisioning.events activation.events"

create_topic() {
  topic="$1"
  echo "Creando topic: $topic"
  /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server "$BROKER" \
    --create --if-not-exists \
    --topic "$topic" \
    --partitions "$PARTITIONS" \
    --replication-factor "$REPLICATION" \
    --config retention.ms="$RETENTION_MS"
}

for topic in $TOPICS; do
  create_topic "$topic"
  create_topic "${topic}.dlq"
done

echo "Topics creados correctamente."
/opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BROKER" --list