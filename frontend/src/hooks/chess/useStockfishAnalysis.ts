'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import StockfishWorker from '@/hooks/chess/useStockfish';
import {
  EngineLine,
  fetchLichessCloudEval,
  formatLocalScore,
  uciToSanLine,
} from '@/utils/chess/stockfishAnalysisUtils';

interface UseStockfishAnalysisParams {
  fen: string;
  enabled: boolean;
  depth: number;
  multiPv: number;
  threads: number;
  hashMb: number;
  // fastMode removed
}

export type { EngineLine };

export function useStockfishAnalysis({
  fen,
  enabled,
  depth,
  multiPv,
  threads,
  hashMb,
}: UseStockfishAnalysisParams) {
  const workerRef = useRef<StockfishWorker | null>(null);
  const [engineDepth, setEngineDepth] = useState<number>(0);
  const [engineNps, setEngineNps] = useState<number>(0);
  const [linesMap, setLinesMap] = useState<Record<number, EngineLine>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [targetDepth, setTargetDepth] = useState(depth);
  const [isReady, setIsReady] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<'idle' | 'cloud' | 'local'>('idle');
  const runIdRef = useRef(0);
  const fenRef = useRef(fen);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    if (!enabled) {
      if (workerRef.current) {
        workerRef.current.stop();
      }
      setIsAnalyzing(false);
      setAnalysisSource('idle');
      return;
    }

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsReady(false);
    }

    const worker = new StockfishWorker();
    workerRef.current = worker;
    worker.onMessage = (data: unknown) => {
      if (typeof data !== 'string') return;
      const text = data.trim();

      if (text === 'readyok') {
        setIsReady(true);
        return;
      }

      if (text.startsWith('bestmove')) {
        setIsAnalyzing(false);
        return;
      }

      if (!text.startsWith('info') || !text.includes(' pv ') || !text.includes(' score ')) {
        return;
      }

      const depthMatch = text.match(/\bdepth (\d+)/);
      const lineDepth = depthMatch ? Number(depthMatch[1]) : 0;
      if (lineDepth > 0) {
        setEngineDepth(lineDepth);
      }

      const npsMatch = text.match(/\bnps (\d+)/);
      if (npsMatch) {
        setEngineNps(Number(npsMatch[1]));
      }

      const multipvMatch = text.match(/\bmultipv (\d+)/);
      const multipv = multipvMatch ? Number(multipvMatch[1]) : 1;
      const scoreText = formatLocalScore(text);
      if (!scoreText) return;

      const pvRaw = text.split(' pv ')[1] || '';
      const uciMoves = pvRaw.trim().split(/\s+/).filter(Boolean);
      const pvSan = uciToSanLine(fenRef.current, uciMoves);

      setLinesMap((prev) => ({
        ...prev,
        [multipv]: {
          multipv,
          depth: lineDepth,
          scoreText,
          pvSan,
          isLong: pvSan.length > 72,
        },
      }));
    };

    worker.worker.postMessage('uci');
    worker.worker.postMessage('isready');

    return () => {
      if (workerRef.current) {
        workerRef.current.stop();
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    runIdRef.current += 1;
    const runId = runIdRef.current;
    const abortController = new AbortController();

    setTargetDepth(depth);
    setLinesMap({});
    setEngineDepth(0);
    setEngineNps(0);
    setIsAnalyzing(true);
    setAnalysisSource('idle');

    const runAnalysis = async () => {
      try {
        const cloud = await fetchLichessCloudEval(fen, multiPv, abortController.signal);
        if (runId !== runIdRef.current) return;

        if (cloud.ok) {
          setLinesMap(cloud.lines);
          setEngineDepth(Math.max(cloud.depth, depth));
          setEngineNps(0);
          setIsAnalyzing(false);
          setAnalysisSource('cloud');
          return;
        }
      } catch {
        // Fallback to local worker.
      }

      if (runId !== runIdRef.current) return;
      if (!workerRef.current || !isReady) {
        setIsAnalyzing(false);
        setAnalysisSource('idle');
        return;
      }

      const worker = workerRef.current;
      worker.stop();
      setIsAnalyzing(true);
      setAnalysisSource('local');
      worker.worker.postMessage('ucinewgame');
      worker.worker.postMessage(`setoption name Threads value ${threads}`);
      worker.worker.postMessage(`setoption name Hash value ${hashMb}`);
      worker.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
      worker.worker.postMessage(`position fen ${fen}`);
      worker.worker.postMessage(`go depth ${depth}`);
    };

    void runAnalysis();

    return () => {
      abortController.abort();
    };
  }, [enabled, fen, depth, multiPv, isReady, threads, hashMb]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const lines = useMemo(() => {
    if (!enabled) return [];
    return Object.values(linesMap).sort((a, b) => a.multipv - b.multipv);
  }, [enabled, linesMap]);

  const evaluation = enabled ? lines[0]?.scoreText || '-' : '-';
  const engineNpsMn = enabled && engineNps > 0 ? `${(engineNps / 1_000_000).toFixed(2)} MN/s` : '-';
  const progressPercent = enabled
    ? Math.max(0, Math.min(100, Math.round((engineDepth / Math.max(1, targetDepth)) * 100)))
    : 0;

  return {
    engineDepth: enabled ? engineDepth : 0,
    evaluation,
    engineNpsMn,
    isAnalyzing: enabled && isAnalyzing,
    progressPercent,
    lines,
    analysisSource,
  };
}
