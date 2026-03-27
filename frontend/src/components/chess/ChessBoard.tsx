'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoardPane from '@/components/chess/ChessBoardPane';
import ChessFenPgnPanel from '@/components/chess/ChessFenPgnPanel';
import ChessSidebar from '@/components/chess/ChessSidebar';
import {
  getInitialBoardState,
  PIECES,
  rebuildFensFromMoves,
  START_FEN,
  stripPgnHeaders,
  type Piece,
} from '@/components/chess/chessBoardModel';
import { useStockfishAnalysis } from '@/hooks/chess/useStockfishAnalysis';

interface ChessBoardComponentProps {
  initialFen?: string;
  initialPgn?: string;
  onMove?: (move: string) => void;
  onMoveDetailed?: (move: { san: string; uci: string; fen: string }) => void;
  onPositionChange?: (fen: string) => void;
  showSidebar?: boolean;
  showFenPgnPanel?: boolean;
  showAnalysisTools?: boolean;
  autoEnableSetupMode?: boolean;
}

const ChessBoardComponent: React.FC<ChessBoardComponentProps> = ({
  initialFen,
  initialPgn = '',
  onMove,
  onMoveDetailed,
  onPositionChange,
  showSidebar = true,
  showFenPgnPanel = true,
  showAnalysisTools = true,
  autoEnableSetupMode = false,
}) => {
  const initialBoardState = useMemo(
    () => getInitialBoardState(initialFen, initialPgn),
    [initialFen, initialPgn],
  );

  const [game, setGame] = useState(initialBoardState.game);
  const [historyFens, setHistoryFens] = useState<string[]>(initialBoardState.fens);
  const [positionIndex, setPositionIndex] = useState(initialBoardState.index);

  const [engineEnabled, setEngineEnabled] = useState(false);
  const [engineSettingsOpen, setEngineSettingsOpen] = useState(false);
  const [analysisDepth, setAnalysisDepth] = useState(18);
  const [multiPv, setMultiPv] = useState(3);
  const [engineThreads, setEngineThreads] = useState(() => {
    if (typeof navigator === 'undefined') return 4;
    const hw = navigator.hardwareConcurrency || 4;
    return Math.max(1, Math.min(16, hw));
  });
  const [engineHashMb, setEngineHashMb] = useState(1024);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(autoEnableSetupMode);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);

  const [inputFen, setInputFen] = useState(initialBoardState.fens[initialBoardState.index]);
  const [inputPgn, setInputPgn] = useState(stripPgnHeaders(initialBoardState.game.pgn()));

  useEffect(() => {
    setGame(initialBoardState.game);
    setHistoryFens(initialBoardState.fens);
    setPositionIndex(initialBoardState.index);
    setInputFen(initialBoardState.fens[initialBoardState.index]);
    setInputPgn(stripPgnHeaders(initialBoardState.game.pgn()));
    setEditMode(autoEnableSetupMode);
    setMenuOpen(false);
  }, [autoEnableSetupMode, initialBoardState]);

  useEffect(() => {
    setEditMode(autoEnableSetupMode);
  }, [autoEnableSetupMode]);

  useEffect(() => {
    if (!showAnalysisTools) {
      setEngineEnabled(false);
      setEngineSettingsOpen(false);
    }
  }, [showAnalysisTools]);

  const currentFen = historyFens[positionIndex] || historyFens[0] || START_FEN;
  const moves = game.history();

  const {
    engineDepth,
    evaluation,
    engineNpsMn,
    isAnalyzing,
    progressPercent,
    lines,
    analysisSource,
  } =
    useStockfishAnalysis({
    fen: currentFen,
    enabled: engineEnabled,
    depth: analysisDepth,
    multiPv,
    threads: engineThreads,
    hashMb: engineHashMb,
  });

  const loadFen = useCallback((fen: string) => {
    const normalized = fen.trim();
    if (!normalized) return;
    try {
      const parsed = new Chess(normalized);
      const parsedFen = parsed.fen();
      setGame(parsed);
      setHistoryFens([parsedFen]);
      setPositionIndex(0);
      setInputFen(parsedFen);
      setInputPgn('');
      setEditMode(false);
      if (onPositionChange) onPositionChange(parsedFen);
    } catch {
      // ignore while user types
    }
  }, [onPositionChange]);

  const loadPgn = useCallback((pgn: string) => {
    const normalized = pgn.trim();
    if (!normalized) return;
    try {
      const parsed = new Chess();
      parsed.loadPgn(normalized);
      const parsedMoves = parsed.history();
      const fens = rebuildFensFromMoves(START_FEN, parsedMoves);
      const nextIndex = fens.length - 1;
      setGame(parsed);
      setHistoryFens(fens);
      setPositionIndex(nextIndex);
      setInputFen(fens[nextIndex]);
      setInputPgn(stripPgnHeaders(parsed.pgn()));
      setEditMode(false);
      if (onPositionChange) onPositionChange(fens[nextIndex]);
    } catch {
      // ignore while user types
    }
  }, [onPositionChange]);

  const makeAMove = useCallback(
    (move: string | { from: string; to: string; promotion?: string }) => {
      try {
        const baseFen = historyFens[0] || START_FEN;
        const replay = new Chess(baseFen);
        for (let i = 0; i < positionIndex; i += 1) replay.move(moves[i]);
        const result = replay.move(move);
        if (!result) return null;

        const nextMoves = replay.history();
        const nextFens = rebuildFensFromMoves(baseFen, nextMoves);
        const nextIndex = nextFens.length - 1;

        setGame(replay);
        setHistoryFens(nextFens);
        setPositionIndex(nextIndex);
        setInputFen(nextFens[nextIndex]);
        setInputPgn(stripPgnHeaders(replay.pgn()));
        if (onMove) onMove(result.san);
        if (onMoveDetailed) {
          const uci = `${result.from}${result.to}${result.promotion || ''}`.toLowerCase();
          onMoveDetailed({ san: result.san, uci, fen: nextFens[nextIndex] });
        }
        if (onPositionChange) onPositionChange(nextFens[nextIndex]);
        return result;
      } catch {
        return null;
      }
    },
    [historyFens, moves, onMove, onMoveDetailed, onPositionChange, positionIndex],
  );

  const goToMove = useCallback(
    (index: number) => {
      const bounded = Math.max(0, Math.min(index, historyFens.length - 1));
      setPositionIndex(bounded);
      const replay = new Chess(historyFens[0] || START_FEN);
      for (let i = 0; i < bounded; i += 1) replay.move(moves[i]);
      setInputFen(historyFens[bounded]);
      setInputPgn(stripPgnHeaders(replay.pgn()));
      if (onPositionChange) onPositionChange(historyFens[bounded]);
    },
    [historyFens, moves, onPositionChange],
  );

  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!targetSquare) return false;

      if (editMode) {
        const board = new Chess(currentFen);
        const piece = board.get(sourceSquare as Square);
        if (!piece) return false;
        board.remove(sourceSquare as Square);
        board.put(piece, targetSquare as Square);
        const newFen = board.fen();
        setGame(new Chess(newFen));
        setHistoryFens([newFen]);
        setPositionIndex(0);
        setInputFen(newFen);
        setInputPgn('');
        if (onPositionChange) onPositionChange(newFen);
        return true;
      }

      const result = makeAMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      return result !== null;
    },
    [currentFen, editMode, makeAMove, onPositionChange],
  );

  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      if (!editMode) return;
      const board = new Chess(currentFen);
      if (selectedPiece) {
        board.put({ type: selectedPiece.type, color: selectedPiece.color }, square as Square);
      } else {
        board.remove(square as Square);
      }
      const newFen = board.fen();
      setGame(new Chess(newFen));
      setHistoryFens([newFen]);
      setPositionIndex(0);
      setInputFen(newFen);
      setInputPgn('');
      if (onPositionChange) onPositionChange(newFen);
    },
    [currentFen, editMode, onPositionChange, selectedPiece],
  );

  const resetGame = useCallback(() => {
    setGame(new Chess(START_FEN));
    setHistoryFens([START_FEN]);
    setPositionIndex(0);
    setInputFen(START_FEN);
    setInputPgn('');
    setEditMode(false);
    setMenuOpen(false);
    if (onPositionChange) onPositionChange(START_FEN);
  }, [onPositionChange]);

  const playUciMove = useCallback(
    (uci: string) => {
      const trimmed = (uci || '').trim().toLowerCase();
      if (trimmed.length < 4) return false;
      const from = trimmed.slice(0, 2);
      const to = trimmed.slice(2, 4);
      const promotion = trimmed.length > 4 ? trimmed[4] : undefined;
      const result = makeAMove({ from, to, promotion });
      return result !== null;
    },
    [makeAMove],
  );

  return (
    <div
      className={`mx-auto w-full max-w-[1080px] grid grid-cols-1 ${
        showSidebar ? 'lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]' : ''
      } gap-5 lg:gap-8 items-stretch p-2 sm:p-4`}
    >
      <ChessBoardPane
        currentFen={currentFen}
        editMode={editMode}
        selectedPiece={selectedPiece}
        pieces={PIECES}
        onDrop={onDrop}
        onSquareClick={onSquareClick}
        onSelectPiece={setSelectedPiece}
      />

      {showSidebar && (
        <ChessSidebar
          showAnalysisTools={showAnalysisTools}
          engineEnabled={engineEnabled}
          evaluation={evaluation}
          engineLabel="SF18 15MB, NNUE"
          analysisSource={analysisSource}
          engineDepth={engineDepth}
          engineNpsMn={engineNpsMn}
          isAnalyzing={isAnalyzing}
          progressPercent={progressPercent}
          lines={lines}
          settingsOpen={engineSettingsOpen}
          analysisDepth={analysisDepth}
          multiPv={multiPv}
          threads={engineThreads}
          hashMb={engineHashMb}
          currentFen={currentFen}
          moves={moves}
          positionIndex={positionIndex}
          menuOpen={menuOpen}
          editMode={editMode}
          onToggleEngine={() => setEngineEnabled((prev) => !prev)}
          onToggleSettings={() => setEngineSettingsOpen((prev) => !prev)}
          onAnalysisDepthChange={(value) => {
            if (!Number.isFinite(value)) return;
            setAnalysisDepth(Math.max(8, Math.min(30, Math.round(value))));
          }}
          onMultiPvChange={(value) => {
            if (!Number.isFinite(value)) return;
            setMultiPv(Math.max(1, Math.min(5, Math.round(value))));
          }}
          onThreadsChange={(value) => {
            if (!Number.isFinite(value)) return;
            setEngineThreads(Math.max(1, Math.min(16, Math.round(value))));
          }}
          onHashMbChange={(value) => {
            if (!Number.isFinite(value)) return;
            setEngineHashMb(Math.max(64, Math.min(2048, Math.round(value / 64) * 64)));
          }}
          onGoToMove={goToMove}
          onPlayUciMove={playUciMove}
          onPrev={() => goToMove(positionIndex - 1)}
          onNext={() => goToMove(positionIndex + 1)}
          onToggleMenu={() => setMenuOpen((prev) => !prev)}
          onToggleEditMode={() => setEditMode((prev) => !prev)}
          onReset={resetGame}
        />
      )}

      {showFenPgnPanel && (
        <div className={showSidebar ? 'lg:col-span-2' : ''}>
          <ChessFenPgnPanel
            inputFen={inputFen}
            inputPgn={inputPgn}
            onInputFenChange={(value) => {
              setInputFen(value);
              loadFen(value);
              if (value.trim()) setInputPgn('');
            }}
            onInputPgnChange={(value) => {
              setInputPgn(value);
              loadPgn(value);
              if (!value.trim()) setInputFen(currentFen);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ChessBoardComponent;
