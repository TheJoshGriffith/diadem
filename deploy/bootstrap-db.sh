#!/bin/bash
# Creates Diadem's internal database and its two users on Harris.
# Run on Harris:  bash bootstrap-db.sh
set -u
read -rsp 'MariaDB root password: ' PW; echo

INTERNAL_PW=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
GOLBAT_PW=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)

cat <<EOSQL | docker exec -e NP="$PW" -i mariadb sh -c 'mariadb -u root -p"$NP"'
CREATE DATABASE IF NOT EXISTS diadem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Owns its own schema; drizzle migrations need DDL rights here.
CREATE USER IF NOT EXISTS 'diadem'@'%' IDENTIFIED BY '$INTERNAL_PW';
ALTER USER 'diadem'@'%' IDENTIFIED BY '$INTERNAL_PW';
GRANT ALL PRIVILEGES ON diadem.* TO 'diadem'@'%';

-- Reads the scanner data only. No write access to golbat, deliberately.
CREATE USER IF NOT EXISTS 'diadem_ro'@'%' IDENTIFIED BY '$GOLBAT_PW';
ALTER USER 'diadem_ro'@'%' IDENTIFIED BY '$GOLBAT_PW';
GRANT SELECT ON golbat.* TO 'diadem_ro'@'%';

FLUSH PRIVILEGES;
EOSQL
RC=$?
[ "$RC" != 0 ] && { echo "FAILED (rc=$RC)"; exit 1; }

echo
echo "=========================================================="
echo "DIADEM__SERVER__INTERNALDB__USER=diadem"
echo "DIADEM__SERVER__INTERNALDB__PASSWORD=$INTERNAL_PW"
echo "DIADEM__SERVER__DB__USER=diadem_ro"
echo "DIADEM__SERVER__DB__PASSWORD=$GOLBAT_PW"
echo "=========================================================="
echo "Put these in the Unraid template, then delete this output."
