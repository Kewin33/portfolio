
class StockfishWorker {
  worker: Worker;
  onMessage: ((data: any) => void) | null;

  constructor() {
    // Load the worker from the public folder to avoid bundling server-only modules
    // (some stockfish builds reference Node `fs` which breaks the Next.js client bundle).
    // We serve a small worker script at `/stockfish/stockfish-worker.js` which
    // itself loads the Stockfish engine via importScripts from a CDN.
    this.worker = new Worker('/stockfish/stockfish-worker.js');
    this.onMessage = null;
    this.worker.onmessage = (e: MessageEvent) => {
      if (this.onMessage) this.onMessage(e.data);
    };
  }

  evaluate(fen: string, depth: number = 12) {
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);
  }

  stop() {
    this.worker.postMessage('stop');
  }

  terminate() {
    this.worker.terminate();
  }
}

export default StockfishWorker;
