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
  tournamentModeTimeLimit,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  isTournamentMode: false,
  setTournamentMode: (_: boolean) => {},
  timeLeft: tournamentModeTimeLimit,
  timeoutCount: 0,
  moveCount: 0,
  totalThinkingTime: 0,
  averageThinkingTime: 0,
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const turnStartTimeRef = useRef<number>();
  const timeLeftRef = useRef(tournamentModeTimeLimit);
  const isMovingRef = useRef(false);

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

  const simulateMove = (direction: MoveDirection) => {
    const testState = gameReducer(gameState, { type: direction });
    return testState.hasChanged;
  };

  const getAvailableMoves = () => {
    const moves: MoveDirection[] = ["move_up", "move_down", "move_left", "move_right"];
    return moves.filter(move => simulateMove(move));
  };

  const makeRandomMove = () => {
    const availableMoves = getAvailableMoves();
    if (availableMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      dispatch({ type: availableMoves[randomIndex] });
      dispatch({ type: "increment_timeout_count" });
    }
  };

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    if (gameState.isTournamentMode && gameState.status === "ongoing" && !isMovingRef.current) {
      timeLeftRef.current -= deltaTime;

      if (timeLeftRef.current <= 0) {
        timeLeftRef.current = tournamentModeTimeLimit;
        turnStartTimeRef.current = timestamp;
        makeRandomMove();
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [gameState.isTournamentMode, gameState.status]);

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => {
        isMovingRef.current = true;
        if (gameState.isTournamentMode && turnStartTimeRef.current && lastTimeRef.current) {
          const thinkingTime = (lastTimeRef.current - turnStartTimeRef.current) / 1000;
          dispatch({ type: "record_thinking_time", thinkingTime });
        }
        dispatch({ type });
        if (gameState.isTournamentMode) {
          timeLeftRef.current = tournamentModeTimeLimit;
        }
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch, gameState.isTournamentMode],
  );

  const startGame = () => {
    dispatch({ type: "reset_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
    timeLeftRef.current = tournamentModeTimeLimit;
    turnStartTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();
    isMovingRef.current = false;
  };

  const setTournamentMode = useCallback((isTournamentMode: boolean) => {
    dispatch({ type: "set_tournament_mode", isTournamentMode });
  }, []);

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
        isMovingRef.current = false;
        turnStartTimeRef.current = performance.now();
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (gameState.isTournamentMode && gameState.status === "ongoing") {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.isTournamentMode, gameState.status, animate]);

  useEffect(() => {
    if (gameState.status !== "ongoing" && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [gameState.status]);

  const averageThinkingTime = gameState.moveCount > 0
    ? gameState.totalThinkingTime / gameState.moveCount
    : 0;

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        getTiles,
        moveTiles,
        startGame,
        isTournamentMode: gameState.isTournamentMode,
        setTournamentMode,
        timeLeft: Math.max(0, timeLeftRef.current),
        timeoutCount: gameState.timeoutCount,
        moveCount: gameState.moveCount,
        totalThinkingTime: gameState.totalThinkingTime,
        averageThinkingTime,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
