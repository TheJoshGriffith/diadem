#!/usr/bin/env node
/**
 * Applies the drizzle migrations generated at build time to the internal
 * database. Uses drizzle-orm + mysql2, both production dependencies, so
 * drizzle-kit is not needed at runtime.
 */
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'smol-toml';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

const cfg = parse(readFileSync('/app/config/config.toml', 'utf8'));
const db = cfg?.server?.internalDb;
if (!db?.host) { console.error('[migrate] server.internalDb not configured'); process.exit(1); }
if (!existsSync('/app/drizzle')) { console.log('[migrate] no migrations bundled, skipping'); process.exit(0); }

const conn = await mysql.createConnection({
  host: db.host, port: db.port ?? 3306, user: db.user,
  password: db.password, database: db.database, multipleStatements: true
});
try {
  await migrate(drizzle(conn), { migrationsFolder: '/app/drizzle' });
  console.log('[migrate] internal schema up to date');
} finally {
  await conn.end();
}
