#!/bin/bash

# Lade Umgebungsvariablen aus .env falls vorhanden
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Verwende Umgebungsvariablen oder Standardwerte
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_NAME=${DB_NAME}

if [ -z "$DB_NAME" ]; then
    echo "Fehler: DB_NAME ist nicht gesetzt. Bitte .env Datei erstellen oder Datenbankname angeben."
    exit 1
fi

# Erstelle Schema-Dump ohne Daten
mysqldump --no-data \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    -p \
    "$DB_NAME" > schema-dump.sql

if [ $? -eq 0 ]; then
    echo "Schema-Dump erfolgreich erstellt: schema-dump.sql"
else
    echo "Fehler beim Erstellen des Schema-Dumps"
    exit 1
fi
