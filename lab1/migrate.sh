#!/bin/bash
set -eu

export MYSQL_PWD="$DB_PASSWORD"

run() {
  mysql --protocol=TCP -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" "$@"
}

run "$DB_NAME" -e "CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)"

for f in /migrations/*.sql; do
  name=$(basename "$f")
  applied=$(run -N -B "$DB_NAME" -e "SELECT COUNT(*) FROM schema_migrations WHERE filename='$name'")
  if [ "$applied" = "0" ]; then
    echo "Applying $name"
    run "$DB_NAME" < "$f"
    run "$DB_NAME" -e "INSERT INTO schema_migrations (filename) VALUES ('$name')"
  else
    echo "Skipping $name (already applied)"
  fi
done

echo "Database migration completed successfully."