#!/bin/bash

set -eu

export MYSQL_PWD="$DB_PASSWORD"

DB_PORT="${DB_PORT:-3306}"

mysql_cmd() {
  mysql \
    --protocol=TCP \
    --default-character-set=utf8mb4 \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    "$@"
}

echo "Checking whether database is already initialized..."

PRODUCTS_EXISTS=$(
  mysql_cmd \
    -N \
    -B \
    "$DB_NAME" \
    -e "
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = '$DB_NAME'
        AND table_name = 'products';
    "
)

if [ "$PRODUCTS_EXISTS" = "1" ]; then
  echo "Database already initialized."
  echo "Checking product text encoding..."

  mysql_cmd "$DB_NAME" <<'SQL'
UPDATE products
SET
  title = CASE
    WHEN title REGEXP 'Ð|Ñ|Â|â'
    THEN CONVERT(
      CAST(CONVERT(title USING latin1) AS BINARY)
      USING utf8mb4
    )
    ELSE title
  END,
  description = CASE
    WHEN description REGEXP 'Ð|Ñ|Â|â'
    THEN CONVERT(
      CAST(CONVERT(description USING latin1) AS BINARY)
      USING utf8mb4
    )
    ELSE description
  END,
  manufacturer = CASE
    WHEN manufacturer REGEXP 'Ð|Ñ|Â|â'
    THEN CONVERT(
      CAST(CONVERT(manufacturer USING latin1) AS BINARY)
      USING utf8mb4
    )
    ELSE manufacturer
  END,
  diodes = CASE
    WHEN diodes REGEXP 'Ð|Ñ|Â|â'
    THEN CONVERT(
      CAST(CONVERT(diodes USING latin1) AS BINARY)
      USING utf8mb4
    )
    ELSE diodes
  END,
  characteristic1 = CASE
    WHEN characteristic1 REGEXP 'Ð|Ñ|Â|â'
    THEN CONVERT(
      CAST(CONVERT(characteristic1 USING latin1) AS BINARY)
      USING utf8mb4
    )
    ELSE characteristic1
  END,
  characteristic2 = CASE
    WHEN characteristic2 REGEXP 'Ð|Ñ|Â|â'
    THEN CONVERT(
      CAST(CONVERT(characteristic2 USING latin1) AS BINARY)
      USING utf8mb4
    )
    ELSE characteristic2
  END,
  brand = CASE
    WHEN brand REGEXP 'Ð|Ñ|Â|â'
    THEN CONVERT(
      CAST(CONVERT(brand USING latin1) AS BINARY)
      USING utf8mb4
    )
    ELSE brand
  END;

ALTER TABLE products
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
SQL

  echo "Product text encoding check completed."
  echo "Database already initialized, skipping migrations."
  exit 0
fi

echo "Database is empty. Running migrations..."

echo "Running database_setup.sql"
mysql_cmd "$DB_NAME" < /migrations/01_database_setup.sql

echo "Running database_update.sql"
mysql_cmd "$DB_NAME" < /migrations/02_database_update.sql

echo "Running database_update_with_temperature.sql"
mysql_cmd "$DB_NAME" < /migrations/03_database_update_with_temperature.sql

echo "Running database_orders_table.sql"
mysql_cmd "$DB_NAME" < /migrations/04_database_orders_table.sql

echo "Database migration completed successfully."