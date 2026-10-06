FROM mysql:8.4.11

WORKDIR /migrations

COPY backend_lab11/database_setup.sql ./01_database_setup.sql
COPY backend_lab11/database_update.sql ./02_database_update.sql
COPY backend_lab11/database_update_with_temperature.sql ./03_database_update_with_temperature.sql
COPY backend_lab11/database_orders_table.sql ./04_database_orders_table.sql
COPY --chmod=755 migrate.sh ./migrate.sh

ENTRYPOINT ["/bin/bash", "/migrations/migrate.sh"]