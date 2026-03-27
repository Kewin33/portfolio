import traceback
try:
    from stockfish import Stockfish
    print('Success')
except Exception as e:
    traceback.print_exc()
