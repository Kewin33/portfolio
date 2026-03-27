// Worker bootstrap with resilient CDN fallback (standard Stockfish JS only).
const stockfishSources = [
	'https://unpkg.com/stockfish.js@latest/stockfish.js',
	'https://cdn.jsdelivr.net/npm/stockfish.js@latest/stockfish.js',
];

let loaded = false;
for (const source of stockfishSources) {
	try {
		importScripts(source);
		loaded = true;
		break;
	} catch (error) {
		// Try the next source.
	}
}

if (!loaded) {
	throw new Error('Failed to load Stockfish worker script from all sources.');
}
