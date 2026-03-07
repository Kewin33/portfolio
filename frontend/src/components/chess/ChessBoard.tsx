'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import StockfishWorker from '@/hooks/useStockfish';

interface ChessBoardComponentProps {
  initialFen?: string;
  initialPgn?: string;
  onMove?: (move: string) => void;
}

const ChessBoardComponent: React.FC<ChessBoardComponentProps> = ({
  initialFen,
  initialPgn = '',
  onMove
}) => {
  const t = useTranslations('Chess');
  const [game, setGame] = useState(new Chess(initialFen || undefined));
  const [historyFens, setHistoryFens] = useState<string[]>([new Chess(initialFen || undefined).fen()]);
  const [positionIndex, setPositionIndex] = useState(0); 
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [evaluation, setEvaluation] = useState<string>('0.0');
  const [bestLine, setBestLine] = useState<string>('');
  const [engineDepth, setEngineDepth] = useState<number | null>(null);
  const [engineName, setEngineName] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [inputFen, setInputFen] = useState('');
  const [inputPgn, setInputPgn] = useState('');
  const [selectedPiece, setSelectedPiece] = useState<{type: string, color: string} | null>(null);
  
  const workerRef = useRef<StockfishWorker | null>(null);

  const currentFen = historyFens[positionIndex];

  // Let engine evaluate current FEN if enabled
  useEffect(() => {
    if (!engineEnabled) {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setEvaluation('-');
      setBestLine('-');
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new StockfishWorker();
      workerRef.current.onMessage = (msg) => {
        if (typeof msg === 'string') {
          // UCI identification
          const matchId = msg.match(/id name (.+)/i);
          if (matchId) {
            setEngineName(matchId[1]);
          }

          // depth info
          const matchDepth = msg.match(/info .* depth (\d+)/i);
          if (matchDepth) {
            setEngineDepth(parseInt(matchDepth[1]));
          }
          // Parse info depth string for evaluation
          const matchEval = msg.match(/score cp (-?\d+)/);
          const matchMate = msg.match(/score mate (-?\d+)/);
          if (matchEval) {
            const cp = parseInt(matchEval[1]);
            const evalNum = (cp / 100).toFixed(2);
            // Stockfish's cp is relative to the side to move
            // We want to make it absolute or relative to white if we do parsing, but let's keep it simple:
            setEvaluation(cp > 0 ? `+${evalNum}` : evalNum.toString());
          } else if (matchMate) {
            setEvaluation(`M${matchMate[1]}`);
          }

          const matchPv = msg.match(/pv (.+)/);
          if (matchPv) {
            const pv = matchPv[1].trim();
            // Try to convert a UCI PV (e2e4 e7e5 ...) into human SAN moves (e4 e5 ...)
            try {
              const tempGame = new Chess(currentFen);
              const parts = pv.split(/\s+/).filter(Boolean);
              const sanParts: string[] = [];
              for (const m of parts) {
                // uci-move pattern like e2e4 or e7e8q
                if (/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(m)) {
                  const from = m.slice(0, 2);
                  const to = m.slice(2, 4);
                  const promotion = m.length === 5 ? m[4] : undefined;
                  const res = tempGame.move({ from, to, promotion } as any);
                  if (res && res.san) sanParts.push(res.san);
                  else sanParts.push(m);
                } else {
                  // Maybe it's already SAN; try to apply as SAN
                  const res = tempGame.move(m as any);
                  if (res && res.san) sanParts.push(res.san);
                  else sanParts.push(m);
                }
              }
              setBestLine(sanParts.join(' '));
            } catch (e) {
              setBestLine(pv);
            }
          }
        }
      };
      // ask for id/name so we can show which engine was loaded
      try {
        workerRef.current.worker.postMessage('uci');
      } catch (e) {
        // ignore
      }
    }

    workerRef.current.stop();
    workerRef.current.evaluate(currentFen, 15);

  }, [engineEnabled, currentFen]);

  // Clean up
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    if (initialPgn) {
      loadPgn(initialPgn);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPgn]);

  const loadFen = (fen: string) => {
    try {
      const newGame = new Chess(fen);
      setGame(newGame);
      setHistoryFens([fen]);
      setPositionIndex(0);
    } catch (e) {
      alert("Invalid FEN");
    }
  };

  const loadPgn = (pgn: string) => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgn);
      setGame(newGame);
      
      // Rebuild FENs
      const fens = [new Chess().fen()];
      const replayGame = new Chess();
      const moves = newGame.history();
      for (const move of moves) {
        replayGame.move(move);
        fens.push(replayGame.fen());
      }
      setHistoryFens(fens);
      setPositionIndex(fens.length - 1);
    } catch (e) {
      alert("Invalid PGN");
    }
  };

  const makeAMove = useCallback((move: string | { from: string; to: string; promotion?: string }) => {
    try {
      // Create a game starting from the current displayed position
      const tempGame = new Chess(currentFen);

      // Make the move
      const result = tempGame.move(move);
      if (result) {
        // If we made a move, we discard the tail of the history and append the new move
        // BUT wait, game uses PGN history. If we just continue from a FEN, we lose PGN history.
        // Let's rebuild `game` correctly:
        const newGame = new Chess(historyFens[0]);
        for(let i=1; i<=positionIndex; i++) {
            // we have to re-play moves? Or we just store moves! FENs are enough for currentFen, but `game.history()` needs actual moves.
            // Oh, if we play from standard start, we can replay moves. Let's just use `game` and slice its history up to `positionIndex`.
        }
        
        // Let's keep it simple: if we are building a new variation, we just re-instantiate from start FEN and replay moves up to positionIndex, then apply our new move.
        const updatedGame = new Chess(historyFens[0] || undefined);
        const moves = game.history();
        for(let i=0; i<positionIndex; i++) {
           updatedGame.move(moves[i]);
        }
        updatedGame.move(move);
        
        setGame(updatedGame);
        
        const newFen = updatedGame.fen();
        const newFens = [...historyFens.slice(0, positionIndex + 1), newFen];
        setHistoryFens(newFens);
        setPositionIndex(newFens.length - 1);
        
        if (onMove) onMove(result.san);
        return result;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [game, currentFen, positionIndex, historyFens, onMove]);

  const goToMove = (index: number) => {
    if (index >= 0 && index <= game.history().length) {
      setPositionIndex(index);
    }
  };

  function onDrop({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string | null }) {
    if (!targetSquare) return false;

    if (editMode) {
      const gameCopy = new Chess(currentFen);
      const piece = gameCopy.get(sourceSquare as any);
      if (piece) {
        gameCopy.remove(sourceSquare as any);
        gameCopy.put(piece, targetSquare as any);
        const newFen = gameCopy.fen();
        
        // Reset the main game logic to start from this newly placed FEN
        setGame(new Chess(newFen));
        setHistoryFens([newFen]);
        setPositionIndex(0); 
        return true;
      }
      return false;
    }

    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    return move !== null;
  }

  const handleSquareClick = ({ square }: { square: string }) => {
    if (editMode) {
      const gameCopy = new Chess(currentFen);
      if (selectedPiece) {
        gameCopy.put({ type: selectedPiece.type as any, color: selectedPiece.color as any }, square as any);
      } else {
        gameCopy.remove(square as any); // Eraser behavior
      }
      const newFen = gameCopy.fen();
      
      setGame(new Chess(newFen));
      setHistoryFens([newFen]);
      setPositionIndex(0); 
    }
  };

  const resetGame = () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setGame(new Chess(startFen));
    setHistoryFens([startFen]);
    setPositionIndex(0);
  };

  const pieces = [
    { type: 'p', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'r', color: 'w' }, { type: 'q', color: 'w' }, { type: 'k', color: 'w' },
    { type: 'p', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'r', color: 'b' }, { type: 'q', color: 'b' }, { type: 'k', color: 'b' }
  ];

  const renderMoveList = () => {
    const moves = game.history();
    const movePairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      movePairs.push({
        white: moves[i],
        black: moves[i + 1] || '',
        moveNumber: Math.floor(i / 2) + 1
      });
    }

    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 h-40 overflow-y-auto mb-2 text-sm font-mono flex flex-col gap-1">
        {movePairs.map((pair, i) => (
          <div key={i} className="flex gap-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded rounded px-2">
            <span className="w-8 text-gray-500">{pair.moveNumber}.</span>
            <button 
              onClick={() => goToMove(i * 2 + 1)}
              className={`flex-1 text-left px-1 rounded ${positionIndex === i * 2 + 1 ? 'bg-blue-200 dark:bg-blue-900 font-bold' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              {pair.white}
            </button>
            <button 
              onClick={() => goToMove(i * 2 + 2)}
              disabled={!pair.black}
              className={`flex-1 text-left px-1 rounded ${positionIndex === i * 2 + 2 ? 'bg-blue-200 dark:bg-blue-900 font-bold' : pair.black ? 'hover:bg-gray-300 dark:hover:bg-gray-600' : ''}`}
            >
              {pair.black}
            </button>
          </div>
        ))}
        {moves.length === 0 && <span className="text-gray-400 italic p-2 text-center block">No moves yet</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center p-4">
      <div className="flex flex-col gap-4 w-full max-w-[500px]">
        <div className="aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-gray-200 dark:border-gray-800">
          <Chessboard 
            options={{
              position: currentFen,
              onPieceDrop: onDrop,
              onSquareClick: handleSquareClick,
              boardOrientation: 'white',
              darkSquareStyle: { backgroundColor: '#779556' },
              lightSquareStyle: { backgroundColor: '#ebecd0' }
            }}
          />
        </div>
        
        {editMode && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-center">
            {pieces.map((p, i) => (
              <button 
                key={i}
                className={`w-10 h-10 border hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-all ${selectedPiece?.type === p.type && selectedPiece?.color === p.color ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent'}`}
                onClick={() => setSelectedPiece(selectedPiece?.type === p.type && selectedPiece?.color === p.color ? null : p)}
              >
                <img src={`https://lichess1.org/assets/_L6mN02/piece/cburnett/${p.color}${p.type.toUpperCase()}.svg`} alt="piece" />
              </button>
            ))}
            <button 
                className={`w-10 h-10 border hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 flex items-center justify-center text-red-500 font-bold ${selectedPiece === null ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-transparent'}`}
                onClick={() => setSelectedPiece(null)}
                title="Remove Piece Mode"
            >
                ✕
            </button>
            <p className="text-xs text-gray-500 w-full text-center mt-2 italic">
                {selectedPiece ? `Selected: ${selectedPiece.color === 'w' ? 'White' : 'Black'} ${selectedPiece.type.toUpperCase()}. Click square to place.` : "Eraser Mode: Click square to remove piece."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-[400px] p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('controls')}</h3>
        
        <div className="flex flex-col gap-4">
            {renderMoveList()}
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => goToMove(positionIndex - 1)}
                    disabled={positionIndex <= 0}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                >
                    ←
                </button>
                <button 
                    onClick={() => goToMove(positionIndex + 1)}
                    disabled={positionIndex >= game.history().length}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                >
                    →
                </button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste FEN..." 
                  className="flex-1 px-3 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                  value={inputFen}
                  onChange={(e) => setInputFen(e.target.value)}
                />
                <button onClick={() => loadFen(inputFen)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Load</button>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste PGN..." 
                  className="flex-1 px-3 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                  value={inputPgn}
                  onChange={(e) => setInputPgn(e.target.value)}
                />
                <button onClick={() => loadPgn(inputPgn)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Load</button>
              </div>
            </div>

            <button 
                onClick={resetGame}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 rounded transition-colors"
            >
                {t('reset')}
            </button>
        </div>

        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('engine')}</span>
                <button 
                    onClick={() => setEngineEnabled(!engineEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${engineEnabled ? 'bg-blue-600' : 'bg-gray-400'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${engineEnabled ? 'left-7' : 'left-1'}`} />
                </button>
            </div>
            {engineEnabled && (
              <div className="text-xs space-y-1">
                <div className="flex items-baseline gap-3">
                  <p className="text-sm text-gray-500">{engineName ? `Engine: ${engineName}` : 'Engine'}</p>
                  <p className="text-sm text-gray-500">{engineDepth !== null ? `Depth: ${engineDepth}` : ''}</p>
                </div>
                <p className="text-blue-600 dark:text-blue-400 font-mono">Eval: {evaluation}</p>
                <p className="text-gray-500 truncate">Best: {bestLine}</p>
              </div>
            )}
        </div>

        <div className="mt-2">
            <button 
                onClick={() => setEditMode(!editMode)}
                className={`w-full py-2 rounded border-2 transition-all ${editMode ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-gray-500'}`}
            >
                {editMode ? t('playing') : t('setupMode')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChessBoardComponent;
