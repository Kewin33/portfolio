# ChessBoard Component

A modern, interactive chessboard React component for Next.js, featuring move history, Stockfish engine evaluation, FEN/PGN import, and board editing. Designed for use in a portfolio project with full i18n and dark/light mode support.

## Features
- **Interactive Chessboard**: Play moves, navigate move history, and view move list.
- **Stockfish Engine Integration**: Toggle engine evaluation for the current position (shows score and best line).
- **FEN/PGN Support**: Load positions via FEN or PGN, and reset to the starting position.
- **Edit Mode**: Add/remove pieces, set up custom positions, or erase squares.
- **Responsive Design**: Mobile-first, with modern UI using Tailwind CSS and Framer Motion.
- **i18n Ready**: Uses `next-intl` for translations (German/English).
- **Dark/Light Mode**: Fully styled for both themes.

## Usage
Import and use the component in your Next.js app:

```tsx
import ChessBoardComponent from '@/components/chess/ChessBoard';

<ChessBoardComponent
  initialFen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  initialPgn=""
  onMove={(move) => console.log(move)}
/>
```

### Props
- `initialFen` (optional): Start position in FEN.
- `initialPgn` (optional): Start position in PGN.
- `onMove` (optional): Callback when a move is made.

## Controls
- **Move List**: Click moves to jump to that position.
- **Navigation**: Use arrows to step through move history.
- **FEN/PGN Input**: Paste and load positions/games.
- **Reset**: Reset to the starting position.
- **Engine Toggle**: Enable/disable Stockfish evaluation.
- **Edit Mode**: Place/remove pieces for custom setups.

## Dependencies
- [chess.js](https://github.com/jhlywa/chess.js)
- [react-chessboard](https://github.com/Clariity/react-chessboard)
- [framer-motion](https://www.framer.com/motion/)
- [next-intl](https://github.com/amannn/next-intl)
- [Tailwind CSS](https://tailwindcss.com/)

## Styling
- Uses Tailwind CSS for layout and color scheme (gray + royal blue, light/dark mode).
- Animations via Framer Motion.

## Accessibility & Responsiveness
- Keyboard and screen reader friendly.
- Fully responsive for mobile and desktop.

## License
MIT. See main project for details.
