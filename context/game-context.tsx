import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  tileCountPerDimension,
  tournamentTimeLimit,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";
import useCountdown from "@/hooks/use-countdown";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";
type GameMode = "normal" | "tournament";

const MOVE_DIRECTIONS: MoveDirection[] = [
  "move_up",
  "move_down",
  "move_left",
  "move_right",
];

export const GameContext = createContext({
  score: 0,
  status: "idle" as string,
  gameMode: "normal" as string,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  setGameMode: (_: GameMode) => {},
  timerRemaining: 0,
  timerProgress: 1,
  tournamentStats: { timeoutCount: 0, totalThinkTime: 0, moveCount: 0 },
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const autoMoveRef = useRef(false);
  const turnStartRef = useRef(0);

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

  const hasLegalMoves = useCallback(() => {
    const { tiles, board } = gameState;
    const maxIndex = tileCountPerDimension - 1;

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(board[y][x])) {
          return true;
        }

        if (x < maxIndex) {
          const rightTileId = board[y][x + 1];
          if (!isNil(rightTileId) && tiles[board[y][x]].value === tiles[rightTileId].value) {
            return true;
          }
        }

        if (y < maxIndex) {
          const downTileId = board[y + 1][x];
          if (!isNil(downTileId) && tiles[board[y][x]].value === tiles[downTileId].value) {
            return true;
          }
        }
      }
    }

    return false;
  }, [gameState.board, gameState.tiles]);

  const isTournament = gameState.gameMode === "tournament";
  const timerActive =
    isTournament &&
    gameState.status === "ongoing";

  const handleTimeout = useCallback(() => {
    if (gameState.status !== "ongoing") return;

    dispatch({ type: "record_timeout" });

    if (!hasLegalMoves()) {
      dispatch({ type: "update_status", status: "lost" });
      return;
    }

    const direction =
      MOVE_DIRECTIONS[Math.floor(Math.random() * MOVE_DIRECTIONS.length)];
    autoMoveRef.current = true;
    dispatch({ type: direction });
  }, [gameState.status, hasLegalMoves]);

  const { remaining, progress, reset, stop } = useCountdown(
    tournamentTimeLimit,
    handleTimeout,
    timerActive,
  );

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

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => {
        if (gameState.status !== "ongoing") return;
        dispatch({ type });
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch, gameState.status],
  );

  const startGame = () => {
    dispatch({ type: "reset_game" });
    dispatch({ type: "start_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
    turnStartRef.current = performance.now();
  };

  const setGameMode = useCallback(
    (gameMode: GameMode) => {
      dispatch({ type: "set_game_mode", gameMode });
    },
    [dispatch],
  );

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

  useEffect(() => {
    if (gameState.hasChanged) {
      setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (gameState.status === "won" || gameState.status === "lost") {
      stop();
    }
  }, [gameState.status, stop]);

  useEffect(() => {
    if (gameState.hasChanged && isTournament) {
      if (!autoMoveRef.current) {
        const thinkTime = performance.now() - turnStartRef.current;
        if (thinkTime > 0) {
          dispatch({ type: "record_think_time", time: thinkTime });
        }
      }
      autoMoveRef.current = false;
      turnStartRef.current = performance.now();
      reset();
    }
  }, [gameState.hasChanged]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        gameMode: gameState.gameMode,
        getTiles,
        moveTiles,
        startGame,
        setGameMode,
        timerRemaining: remaining,
        timerProgress: progress,
        tournamentStats: gameState.tournamentStats,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}