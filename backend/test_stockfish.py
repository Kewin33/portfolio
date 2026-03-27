from stockfish import Stockfish
import traceback

path = r"D:\Codes\Portfolio\backend\stockfish\stockfish-windows-x86-64-avx2.exe"
print('Using path:', path)
try:
    sf = Stockfish(path=path, depth=10)
    print('Stockfish object created')
    print('is_fen_valid:', sf.is_fen_valid('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'))
    try:
        print('best move:', sf.get_best_move())
    except Exception as e:
        print('get_best_move raised:')
        traceback.print_exc()
except Exception as e:
    print('Exception on init:')
    traceback.print_exc()

print('done')
