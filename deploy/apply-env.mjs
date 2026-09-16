#!/usr/bin/env node
/**
 * Overlays DIADEM__* environment variables onto config.toml.
 *
 * Convention:  DIADEM__SERVER__DB__HOST=mariadb   ->  server.db.host = "mariadb"
 *   - "__" separates path segments.
 *   - Segments are matched case-insensitively against the existing config, so
 *     DIADEM__SERVER__INTERNALDB__USER correctly finds server.internalDb.user.
 *     Unmatched segments are used verbatim, so new keys are still settable.
 *   - Values are coerced: true/false -> boolean, numeric -> number, else string.
 *   - Prefix a value with "json:" to set an array or object, e.g.
 *     DIADEM__SERVER__PERMISSIONS='json:[{"everyone":true,"features":["*"]}]'
 *
 * The whole file can also be replaced wholesale with DIADEM_CONFIG_TOML_B64.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'smol-toml';

const target = process.argv[2];
if (!target) { console.error('usage: apply-env.mjs <config.toml>'); process.exit(1); }

let config;
if (process.env.DIADEM_CONFIG_TOML_B64) {
  const raw = Buffer.from(process.env.DIADEM_CONFIG_TOML_B64, 'base64').toString('utf8');
  config = parse(raw);
  console.log('[config] base replaced from DIADEM_CONFIG_TOML_B64');
} else {
  config = parse(readFileSync(target, 'utf8'));
}

const coerce = (v) => {
  if (v.startsWith('json:')) return JSON.parse(v.slice(5));
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
};

// Find an existing key case-insensitively so camelCase config keys survive
// SCREAMING_SNAKE env vars. Falls back to the literal segment.
const resolveKey = (obj, seg) => {
  if (obj && typeof obj === 'object') {
    const hit = Object.keys(obj).find((k) => k.toLowerCase() === seg.toLowerCase());
    if (hit) return hit;
  }
  return seg;
};

let applied = 0;
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('DIADEM__')) continue;
  const segments = name.slice('DIADEM__'.length).split('__').filter(Boolean);
  if (!segments.length) continue;

  let node = config;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = resolveKey(node, segments[i]);
    if (typeof node[key] !== 'object' || node[key] === null || Array.isArray(node[key])) node[key] = {};
    node = node[key];
  }
  const leaf = resolveKey(node, segments[segments.length - 1]);
  node[leaf] = coerce(value);
  applied++;
  const secret = /secret|password|token|clientsecret|basicauth/i.test(leaf);
  console.log(`[config] ${segments.join('.')} = ${secret ? '***' : JSON.stringify(node[leaf])}`);
}

writeFileSync(target, stringify(config));
console.log(`[config] wrote ${target} (${applied} override${applied === 1 ? '' : 's'})`);
