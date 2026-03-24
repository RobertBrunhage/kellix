#!/bin/bash
# Credential helper for Steve skills
# Usage:
#   credential.sh get <user> <skill>        - outputs JSON credentials
#   credential.sh set <user> <skill> <json>  - stores credentials
#   credential.sh has <user> <skill>         - exits 0 if exists, 1 if not

set -e

SERVICE_PREFIX="steve-assistant"
ACTION="$1"
USER="$2"
SKILL="$3"
SERVICE="${SERVICE_PREFIX}/${USER}/${SKILL}"

case "$ACTION" in
  get)
    ENCODED=$(security find-generic-password -s "$SERVICE" -w 2>/dev/null) || { echo "null"; exit 1; }
    echo "$ENCODED" | base64 -d
    ;;
  set)
    JSON="$4"
    ENCODED=$(echo -n "$JSON" | base64)
    security delete-generic-password -s "$SERVICE" 2>/dev/null || true
    security add-generic-password -s "$SERVICE" -a "$USER" -w "$ENCODED" -U
    echo "ok"
    ;;
  has)
    security find-generic-password -s "$SERVICE" -w >/dev/null 2>&1
    ;;
  *)
    echo "Usage: credential.sh {get|set|has} <user> <skill> [json]" >&2
    exit 1
    ;;
esac
