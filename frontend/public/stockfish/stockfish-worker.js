// Minimal worker that loads Stockfish from CDN to avoid bundling Node-only modules.
// It delegates directly to the upstream stockfish worker implementation.

// Use a specific CDN path; `@latest` is used for convenience but pin a version for production.
importScripts('https://unpkg.com/stockfish.js@latest/stockfish.js');

// The loaded script defines its own `onmessage` handler and `postMessage` interface.
// No additional code required here.
