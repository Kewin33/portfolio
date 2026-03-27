'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Color, PieceSymbol } from 'chess.js';

type Piece = { type: PieceSymbol; color: Color };

const PIECE_SYMBOLS: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

function getPieceCursor(piece: Piece): string {
  const symbol = PIECE_SYMBOLS[piece.color][piece.type];
  const fill = piece.color === 'w' ? '#a78bfa' : '#8b5cf6';
  const shadow = piece.color === 'w' ? '#6d28d9' : '#4c1d95';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><text x='16' y='22' font-size='22' text-anchor='middle' fill='${fill}' stroke='${shadow}' stroke-width='0.5'>${symbol}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 16 16, auto`;
}

interface ChessBoardPaneProps {
  currentFen: string;
  editMode: boolean;
  selectedPiece: Piece | null;
  pieces: Piece[];
  onDrop: (args: { sourceSquare: string; targetSquare: string | null }) => boolean;
  onSquareClick: (args: { square: string }) => void;
  onSelectPiece: (piece: Piece | null) => void;
}

export default function ChessBoardPane({
  currentFen,
  editMode,
  selectedPiece,
  pieces,
  onDrop,
  onSquareClick,
  onSelectPiece,
}: ChessBoardPaneProps) {
  const pieceCursor = useMemo(
    () => (selectedPiece ? getPieceCursor(selectedPiece) : 'auto'),
    [selectedPiece],
  );

  useEffect(() => {
    if (!editMode || !selectedPiece) {
      document.body.style.removeProperty('cursor');
      return;
    }

    document.body.style.cursor = pieceCursor;
    return () => {
      document.body.style.removeProperty('cursor');
    };
  }, [editMode, selectedPiece, pieceCursor]);

  return (
    <div
      className={`flex flex-col gap-4 w-full max-w-none lg:max-w-[680px] ${
        editMode && selectedPiece ? 'piece-cursor-active' : ''
      }`}
      style={{ ['--piece-cursor' as string]: pieceCursor }}
    >
      <div className="aspect-square self-center w-full max-w-[680px] shadow-2xl rounded-lg overflow-hidden border-4 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Chessboard
          options={{
            position: currentFen,
            onPieceDrop: onDrop,
            onSquareClick,
            boardOrientation: 'white',
            darkSquareStyle: { backgroundColor: '#779556' },
            lightSquareStyle: { backgroundColor: '#ebecd0' },
          }}
        />
      </div>

      {editMode && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-center">
          {pieces.map((piece, idx) => {
            const isSelected =
              selectedPiece?.type === piece.type && selectedPiece?.color === piece.color;
            return (
              <button
                key={`${piece.color}-${piece.type}-${idx}`}
                className={`w-10 h-10 border hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-transparent'
                }`}
                onClick={() => onSelectPiece(isSelected ? null : piece)}
              >
                <img
                  src={`https://lichess1.org/assets/_L6mN02/piece/cburnett/${piece.color}${piece.type.toUpperCase()}.svg`}
                  alt="piece"
                />
              </button>
            );
          })}

          <button
            className={`w-10 h-10 border hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 flex items-center justify-center text-red-500 font-bold ${
              selectedPiece === null
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-transparent'
            }`}
            onClick={() => onSelectPiece(null)}
            title="Remove Piece Mode"
          >
            X
          </button>
        </div>
      )}

      <style jsx global>{`
        .piece-cursor-active,
        .piece-cursor-active *,
        .piece-cursor-active *:hover,
        .piece-cursor-active *:active {
          cursor: var(--piece-cursor) !important;
        }
      `}</style>
    </div>
  );
}
