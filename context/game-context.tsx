import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  tileCountPerDimension,
  tournamentTurnDuration,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

export type MoveDirection =
  | "move_up"
  | "move_down"
  | "move_left"
  | "move_right";

export type GameMode = "normal" | "tournament";

type TournamentStats = {
  completedTurns: number;
  totalThinkingTimeMs: number;
  timeoutCount: number;
};

type GameContextValue = {
  score: number;
  status: "ongoing" | "won" | "lost";
  mode: GameMode;
  remainingTimeMs: number;
  turnDurationMs: number;
  timeoutCount: number;
  averageThinkingTimeMs: number;
  moveTiles: (type: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: () => void;
  setMode: (mode: GameMode) => void;
};

const defaultTournamentStats: TournamentStats = {
  completedTurns: 0,
  totalThinkingTimeMs: 0,
  timeoutCount: 0,
};

const moveDirections: MoveDirection[] = [
  "move_up",
  "move_down",
  "move_left",
  "move_right",
];

export const GameContext = createContext<GameContextValue>({
  score: 0,
  status: "ongoing",
  mode: "normal",
  remainingTimeMs: tournamentTurnDuration,
  turnDurationMs: tournamentTurnDuration,
  timeoutCount: 0,
  averageThinkingTimeMs: 0,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  setMode: (_: GameMode) => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const [mode, setModeState] = useState<GameMode>("normal");
  const [remainingTimeMs, setRemainingTimeMs] =
    useState<number>(tournamentTurnDuration);
  const [tournamentStats, setTournamentStats] =
    useState<TournamentStats>(defaultTournamentStats);
  const gameStateRef = useRef(gameState);
  const modeRef = useRef(mode);
  const turnStartedAtRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const clearTimer = useCallback(() => {
    if (!isNil(frameRef.current)) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    turnStartedAtRef.current = null;
  }, []);

  const resetTournamentStats = useCallback(() => {
    setTournamentStats(defaultTournamentStats);
    setRemainingTimeMs(tournamentTurnDuration);
  }, []);

  const getEmptyCells = useCallback(() => {
    const currentState = gameStateRef.current;
    const results: [number, number][] = [];

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(currentState.board[y][x])) {
          results.push([x, y]);
        }
      }
    }

    return results;
  }, []);

  const appendRandomTile = useCallback(() => {
    const emptyCells = getEmptyCells();

    if (emptyCells.length > 0) {
      const cellIndex = Math.floor(Math.random() * emptyCells.length);
      const newTile = {
        position: emptyCells[cellIndex],
        value: 2,
      };

      dispatch({ type: "create_tile", tile: newTile });
    }
  }, [getEmptyCells]);

  const getTiles = useCallback((): Tile[] => {
    return gameState.tilesByIds.map((tileId: string) => gameState.tiles[tileId]);
  }, [gameState.tiles, gameState.tilesByIds]);

  const getLegalMoves = useCallback((state = gameStateRef.current) => {
    return moveDirections.filter(
      (direction) => gameReducer(state, { type: direction }).hasChanged,
    );
  }, []);

  const recordTurn = useCallback((didTimeout: boolean) => {
    if (modeRef.current !== "tournament" || isNil(turnStartedAtRef.current)) {
      return;
    }

    const thinkingTimeMs = Math.min(
      performance.now() - turnStartedAtRef.current,
      tournamentTurnDuration,
    );

    setTournamentStats((currentStats: TournamentStats) => ({
      completedTurns: currentStats.completedTurns + 1,
      totalThinkingTimeMs: currentStats.totalThinkingTimeMs + thinkingTimeMs,
      timeoutCount: currentStats.timeoutCount + (didTimeout ? 1 : 0),
    }));
  }, []);

  const startTimer = useCallback(
    (nextMode: GameMode = modeRef.current) => {
      if (nextMode !== "tournament") {
        clearTimer();
        setRemainingTimeMs(tournamentTurnDuration);
        return;
      }

      clearTimer();
      turnStartedAtRef.current = performance.now();
      setRemainingTimeMs(tournamentTurnDuration);

      const tick = (timestamp: number) => {
        if (isNil(turnStartedAtRef.current)) {
          return;
        }

        const elapsed = timestamp - turnStartedAtRef.current;
        const nextRemainingTime = Math.max(
          tournamentTurnDuration - elapsed,
          0,
        );

        setRemainingTimeMs(nextRemainingTime);

        if (nextRemainingTime === 0) {
          frameRef.current = null;
          timeoutHandlerRef.current();
          return;
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [clearTimer],
  );

  const performMove = useCallback(
    (type: MoveDirection, didTimeout = false) => {
      const currentState = gameStateRef.current;

      if (currentState.status !== "ongoing") {
        return false;
      }

      const nextState = gameReducer(currentState, { type });

      if (!nextState.hasChanged) {
        return false;
      }

      if (modeRef.current === "tournament") {
        recordTurn(didTimeout);
        startTimer();
      }

      dispatch({ type });
      return true;
    },
    [recordTurn, startTimer],
  );

  const moveTiles = useMemo(
    () =>
      throttle(
        (type: MoveDirection) => {
          performMove(type);
        },
        mergeAnimationDuration * 1.05,
        { trailing: false },
      ),
    [performMove],
  );

  const startGame = useCallback(
    (nextMode: GameMode = modeRef.current) => {
      clearTimer();
      resetTournamentStats();
      dispatch({ type: "reset_game" });
      dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
      dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });

      if (nextMode === "tournament") {
        startTimer(nextMode);
      }
    },
    [clearTimer, resetTournamentStats, startTimer],
  );

  const setMode = useCallback(
    (nextMode: GameMode) => {
      if (modeRef.current === nextMode) {
        return;
      }

      modeRef.current = nextMode;
      setModeState(nextMode);
      startGame(nextMode);
    },
    [startGame],
  );

  const checkGameState = useCallback(() => {
    const currentState = gameStateRef.current;

    if (currentState.tilesByIds.length === 0) {
      return;
    }

    const tiles = Object.values(currentState.tiles) as Tile[];
    const isWon = tiles.some((tile) => tile.value === gameWinTileValue);

    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    if (getLegalMoves(currentState).length === 0) {
      dispatch({ type: "update_status", status: "lost" });
    }
  }, [getLegalMoves]);

  const handleTimeout = useCallback(() => {
    if (
      modeRef.current !== "tournament" ||
      gameStateRef.current.status !== "ongoing"
    ) {
      clearTimer();
      return;
    }

    const legalMoves = getLegalMoves();

    if (legalMoves.length === 0) {
      recordTurn(true);
      clearTimer();
      setRemainingTimeMs(0);
      dispatch({ type: "update_status", status: "lost" });
      return;
    }

    const randomMove =
      legalMoves[Math.floor(Math.random() * legalMoves.length)];
    performMove(randomMove, true);
  }, [clearTimer, getLegalMoves, performMove, recordTurn]);

  timeoutHandlerRef.current = handleTimeout;

  useEffect(() => {
    return () => {
      moveTiles.cancel();
      clearTimer();
    };
  }, [clearTimer, moveTiles]);

  useEffect(() => {
    if (gameState.hasChanged) {
      setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
      }, mergeAnimationDuration);
    }
  }, [appendRandomTile, gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [checkGameState, gameState.hasChanged]);

  useEffect(() => {
    if (mode !== "tournament") {
      clearTimer();
      setRemainingTimeMs(tournamentTurnDuration);
      return;
    }

    if (gameState.status !== "ongoing") {
      clearTimer();
    }
  }, [clearTimer, gameState.status, mode]);

  const averageThinkingTimeMs =
    tournamentStats.completedTurns === 0
      ? 0
      : tournamentStats.totalThinkingTimeMs / tournamentStats.completedTurns;

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        mode,
        remainingTimeMs,
        turnDurationMs: tournamentTurnDuration,
        timeoutCount: tournamentStats.timeoutCount,
        averageThinkingTimeMs,
        getTiles,
        moveTiles,
        startGame: () => startGame(),
        setMode,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
