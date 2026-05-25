import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { isNil } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  moveAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type GameStatus = "ongoing" | "won" | "lost";
export type MoveDirection =
  | "move_up"
  | "move_down"
  | "move_left"
  | "move_right";

type GameContextValue = {
  score: number;
  status: GameStatus;
  isDemoMode: boolean;
  demoInterval: number;
  moveTiles: (_: MoveDirection) => boolean;
  getTiles: () => Tile[];
  startGame: () => void;
  startDemo: (_?: number) => void;
  stopDemo: () => void;
};

const defaultDemoInterval = 500;
const demoMoveDirections: MoveDirection[] = [
  "move_up",
  "move_right",
  "move_down",
  "move_left",
];

export const GameContext = createContext<GameContextValue>({
  score: 0,
  status: "ongoing",
  isDemoMode: false,
  demoInterval: defaultDemoInterval,
  moveTiles: () => false,
  getTiles: () => [] as Tile[],
  startGame: () => {},
  startDemo: () => {},
  stopDemo: () => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoInterval, setDemoInterval] = useState(defaultDemoInterval);
  const isMoveLocked = useRef(false);
  const moveLockTimeout = useRef<ReturnType<typeof window.setTimeout>>();
  const cleanUpTimeout = useRef<ReturnType<typeof window.setTimeout>>();

  const setMoveLock = useCallback((locked: boolean) => {
    isMoveLocked.current = locked;
  }, []);

  const clearMoveLock = useCallback(() => {
    if (moveLockTimeout.current) {
      window.clearTimeout(moveLockTimeout.current);
    }

    setMoveLock(false);
  }, [setMoveLock]);

  const lockMove = useCallback(() => {
    clearMoveLock();
    setMoveLock(true);
    moveLockTimeout.current = window.setTimeout(() => {
      setMoveLock(false);
    }, moveAnimationDuration);
  }, [clearMoveLock, setMoveLock]);

  const getEmptyCells = () => {
    const results: [number, number][] = [];

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(gameState.board[y][x])) {
          results.push([x, y]);
        }
      }
    }
    return results;
  };

  const appendRandomTile = () => {
    const emptyCells = getEmptyCells();
    if (emptyCells.length > 0) {
      const cellIndex = Math.floor(Math.random() * emptyCells.length);
      const newTile = {
        position: emptyCells[cellIndex],
        value: 2,
      };
      dispatch({ type: "create_tile", tile: newTile });
    }
  };

  const getTiles = () => {
    return gameState.tilesByIds.map((tileId) => gameState.tiles[tileId]);
  };

  const resetGame = useCallback(() => {
    clearMoveLock();
    dispatch({ type: "reset_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  }, [clearMoveLock]);

  const moveTiles = useCallback(
    (type: MoveDirection) => {
      if (gameState.status !== "ongoing" || isMoveLocked.current) {
        return false;
      }

      lockMove();
      dispatch({ type });
      return true;
    },
    [gameState.status, lockMove],
  );

  const startGame = useCallback(() => {
    setIsDemoMode(false);
    resetGame();
  }, [resetGame]);

  const startDemo = useCallback(
    (interval = defaultDemoInterval) => {
      setDemoInterval(interval);
      clearMoveLock();

      if (gameState.status !== "ongoing") {
        resetGame();
      }

      setIsDemoMode(true);
    },
    [clearMoveLock, gameState.status, resetGame],
  );

  const stopDemo = useCallback(() => {
    setIsDemoMode(false);
    clearMoveLock();
  }, [clearMoveLock]);

  const checkGameState = () => {
    const isWon =
      Object.values(gameState.tiles).filter((t) => t.value === gameWinTileValue)
        .length > 0;

    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    const { tiles, board } = gameState;

    const maxIndex = tileCountPerDimension - 1;
    for (let x = 0; x < maxIndex; x += 1) {
      for (let y = 0; y < maxIndex; y += 1) {
        if (
          isNil(gameState.board[x][y]) ||
          isNil(gameState.board[x + 1][y]) ||
          isNil(gameState.board[x][y + 1])
        ) {
          return;
        }

        if (tiles[board[x][y]].value === tiles[board[x + 1][y]].value) {
          return;
        }

        if (tiles[board[x][y]].value === tiles[board[x][y + 1]].value) {
          return;
        }
      }
    }

    dispatch({ type: "update_status", status: "lost" });
  };

  const getDemoMove = useCallback(() => {
    const availableMoves = demoMoveDirections.filter((direction) => {
      const nextState = gameReducer(gameState, { type: direction });
      return nextState.hasChanged;
    });

    if (availableMoves.length === 0) {
      return undefined;
    }

    const moveIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[moveIndex];
  }, [gameState]);

  useEffect(() => {
    if (gameState.hasChanged) {
      cleanUpTimeout.current = window.setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
      }, mergeAnimationDuration);

      return () => {
        if (cleanUpTimeout.current) {
          window.clearTimeout(cleanUpTimeout.current);
        }
      };
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!isDemoMode) {
      return;
    }

    if (gameState.status !== "ongoing") {
      setIsDemoMode(false);
      return;
    }

    const intervalId = window.setInterval(() => {
      if (isMoveLocked.current) {
        return;
      }

      const move = getDemoMove();

      if (!move) {
        setIsDemoMode(false);
        return;
      }

      moveTiles(move);
    }, demoInterval);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [demoInterval, gameState.status, getDemoMove, isDemoMode, moveTiles]);

  useEffect(() => {
    return () => {
      clearMoveLock();

      if (cleanUpTimeout.current) {
        window.clearTimeout(cleanUpTimeout.current);
      }
    };
  }, [clearMoveLock]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        isDemoMode,
        demoInterval,
        getTiles,
        moveTiles,
        startGame,
        startDemo,
        stopDemo,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
