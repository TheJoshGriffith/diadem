import * as fs from 'node:fs';
import { parse } from 'toml';
import type { Config } from '@/lib/services/config/configTypes';

// Read at runtime rather than inlining with Vite's ?raw, so the same build can
// be configured per deployment. DIADEM_CONFIG_PATH allows relocating the file;
// the default matches configNode.server.ts, which already reads it this way.
const configPath = process.env.DIADEM_CONFIG_PATH ?? './src/lib/server/config.toml';
const configFile = fs.readFileSync(configPath, 'utf8');

const config: Config = parse(configFile);

export function getServerConfig() {
	return config.server;
}

export function getClientConfig() {
	return config.client;
}

export function isAuthRequired() {
	return config.server.auth.enabled && !config.server.auth.optional
}
