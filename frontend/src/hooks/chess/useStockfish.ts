class StockfishWorker {
  worker: Worker;
  onMessage: ((data: any) => void) | null;

  constructor() {
    const workerUrl = '/stockfish/stockfish-worker.js';
    this.worker = new Worker(workerUrl);
    this.onMessage = null;
    this.worker.onmessage = (e: MessageEvent) => {
      if (this.onMessage) this.onMessage(e.data);
    };
  }

  evaluate(fen: string, depth: number = 12) {
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);
  }

  setOption(name: string, value: string | number | boolean) {
    const normalizedValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
    this.worker.postMessage(`setoption name ${name} value ${normalizedValue}`);
  }

  stop() {
    this.worker.postMessage('stop');
  }

  terminate() {
    this.worker.terminate();
  }
}

export default StockfishWorker;
