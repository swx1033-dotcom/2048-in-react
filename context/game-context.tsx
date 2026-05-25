import {
  PropsWithChildren,
  Reducer,
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { isNil, throttle } from "lodash";
import {
  mergeAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, {
  Action,
  GameStatus,
  initialState,
  State,
} from "@/reducers/game-reducer";
import {
  canMove,
  getRandomMove,
  MoveDirection,
} from "@/utils/moves";

type CompetitionStats = {
  avgThinkingTime: number;
  timeoutCount: number;
  totalMoveTime: number;
  moveCount: number;
};

type GameContextType = {
  score: number;
  status: GameStatus;
  isCompetition: boolean;
  competitionStats: CompetitionStats;
  countdown: number;
  countdownDuration: number;
  moveTiles: (dir: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: (isCompetition?: boolean) => void;
  continueGame: () => void;
  resetTimer: () => void;
  stopTimer: () => void;
};

export const GameContext = createContext<GameContextType>({
  score: 0,
  status: "ongoing",
  isCompetition: false,
  competitionStats: {
    avgThinkingTime: 0,
    timeoutCount: 0,
    totalMoveTime: 0,
    moveCount: 0,
  },
  countdown: 0,
  countdownDuration: 5000,
  moveTiles: () => {},
  getTiles: () => [],
  startGame: () => {},
  continueGame: () => {},
  resetTimer: () => {},
  stopTimer: () => {},
});

const COMPETITION_COUNTDOWN = 5000;

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer<Reducer<State, Action>>(
    gameReducer,
    initialState,
  );
  const [isCompetition, setIsCompetition] = useState(false);
  const [countdown, setCountdown] = useState(COMPETITION_COUNTDOWN);
  const [competitionStats, setCompetitionStats] = useState<CompetitionStats>({
    avgThinkingTime: 0,
    timeoutCount: 0,
    totalMoveTime: 0,
    moveCount: 0,
  });

  const animationFrameRef = useRef<number | undefined>(undefined);
  const cleanupTimeoutRef = useRef<number | undefined>(undefined);
  const lastMoveTimeRef = useRef<number>(0);
  const isMovingRef = useRef<boolean>(false);
  const isCompetitionRef = useRef<boolean>(false);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const clearPendingCleanup = useCallback(() => {
    if (!isNil(cleanupTimeoutRef.current)) {
      window.clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = undefined;
    }
  }, []);

  const getEmptyCells = useCallback(() => {
    const results: [number, number][] = [];
    const { board } = gameStateRef.current;

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(board[y][x])) {
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

  const getTiles = useCallback(() => {
    return gameState.tilesByIds.map((tileId: string) => gameState.tiles[tileId]);
  }, [gameState.tiles, gameState.tilesByIds]);

  const resetTimer = useCallback(() => {
    lastMoveTimeRef.current = performance.now();
    setCountdown(COMPETITION_COUNTDOWN);
  }, []);

  const stopTimer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  const executeMove = useCallback(
    (type: MoveDirection) => {
      const { board, tiles, status } = gameStateRef.current;

      if (isMovingRef.current || status !== "ongoing") {
        return;
      }

      if (!canMove(board, tiles, type)) {
        return;
      }

      isMovingRef.current = true;

      if (isCompetitionRef.current) {
        const now = performance.now();
        if (lastMoveTimeRef.current > 0) {
          const thinkingTime = now - lastMoveTimeRef.current;
          setCompetitionStats((prev: CompetitionStats) => ({
            ...prev,
            totalMoveTime: prev.totalMoveTime + thinkingTime,
            moveCount: prev.moveCount + 1,
            avgThinkingTime:
              (prev.totalMoveTime + thinkingTime) / (prev.moveCount + 1),
          }));
        }
        lastMoveTimeRef.current = now;
      }

      dispatch({ type });
      resetTimer();
    },
    [resetTimer],
  );

  const continueGame = useCallback(() => {
    dispatch({ type: "continue_game" });
  }, []);

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => executeMove(type),
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [executeMove],
  );

  const startGame = useCallback(
    (compMode = false) => {
      clearPendingCleanup();
      stopTimer();
      setIsCompetition(compMode);
      isCompetitionRef.current = compMode;
      setCompetitionStats({
        avgThinkingTime: 0,
        timeoutCount: 0,
        totalMoveTime: 0,
        moveCount: 0,
      });
      lastMoveTimeRef.current = 0;
      isMovingRef.current = false;
      setCountdown(COMPETITION_COUNTDOWN);

      dispatch({ type: "reset_game" });
      dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
      dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });

      if (compMode) {
        lastMoveTimeRef.current = performance.now();
        const tick = (now: number) => {
          if (!isCompetitionRef.current) {
            return;
          }

          const elapsed = now - lastMoveTimeRef.current;
          const remaining = Math.max(0, COMPETITION_COUNTDOWN - elapsed);
          setCountdown(remaining);

          if (remaining <= 0) {
            setCompetitionStats((prev: CompetitionStats) => ({
              ...prev,
              timeoutCount: prev.timeoutCount + 1,
            }));

            const { board, tiles } = gameStateRef.current;
            const randomMove = getRandomMove(board, tiles);

            if (randomMove !== null) {
              executeMove(randomMove);
            } else {
              dispatch({ type: "update_status", status: "lost" });
              stopTimer();
              return;
            }
          }

          animationFrameRef.current = requestAnimationFrame(tick);
        };
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    },
    [clearPendingCleanup, executeMove, stopTimer],
  );

  useEffect(() => {
    if (gameState.hasChanged) {
      clearPendingCleanup();
      cleanupTimeoutRef.current = window.setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
        cleanupTimeoutRef.current = undefined;
      }, mergeAnimationDuration);
    } else {
      isMovingRef.current = false;
    }
  }, [appendRandomTile, clearPendingCleanup, gameState.hasChanged]);

  useEffect(() => {
    if (gameState.status !== "ongoing") {
      isMovingRef.current = false;
      stopTimer();
    }
  }, [gameState.status, stopTimer]);

  useEffect(() => {
    return () => {
      clearPendingCleanup();
      stopTimer();
    };
  }, [clearPendingCleanup, stopTimer]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        isCompetition,
        competitionStats,
        countdown,
        countdownDuration: COMPETITION_COUNTDOWN,
        moveTiles,
        getTiles,
        startGame,
        continueGame,
        resetTimer,
        stopTimer,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
