import { getServerConfig } from '@/lib/services/config/config.server';
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';

export type PokemonResponse = {
	pokemon: PokemonData[]
	examined: number
	skipped: number
	total: number
}

function getHeaders() {
	const golbat = getServerConfig().golbat;
	const headers: Record<string, string> = {
		// Golbat rejects a JSON body without this - 415 Unsupported Media Type.
		"Content-Type": "application/json"
	};
	// Only send these when configured; an absent key would otherwise be sent
	// as the literal string "undefined".
	if (golbat.secret) headers["X-Golbat-Secret"] = golbat.secret;
	if (golbat.auth) headers["Authorization"] = golbat.auth;
	return headers;
}

export async function getSinglePokemon(id: string, thisFetch: typeof fetch = fetch) {
	const url = new URL("api/pokemon/id/" + id, getServerConfig().golbat.url)

	return await thisFetch(
		url,
		{
			method: "GET",
			headers: getHeaders()
		}
	)
}

export async function getMultiplePokemon(body: any) {
	const url = new URL("api/pokemon/v3/scan", getServerConfig().golbat.url)

	const response = await fetch(
		url,
		{
			method: "POST",
			headers: getHeaders(),
			body: JSON.stringify(body)
		}
	)
	if (!response.ok) {
		console.error("Error while fetching Pokemon: " + response.status)
		return undefined
	}
	const result: PokemonResponse = await response.json()
	return result
}