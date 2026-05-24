import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, {
  GameSnapshot,
  GameStatus,
  initialState,
} from "@/reducers/game-reducer";

export type MoveDirection =
  | "move_up"
  | "move_down"
  | "move_left"
  | "move_right";

type GameContextValue = {
  score: number;
  status: GameStatus;
  moveTiles: (direction: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: () => void;
  currentStep: number;
  activeStep: number;
  totalSteps: number;
  isPreviewing: boolean;
  isTimelineLocked: boolean;
  previewTimelineStep: (step: number) => void;
  commitTimelinePreview: () => void;
};

export const GameContext = createContext<GameContextValue>({
  score: 0,
  status: "ongoing",
  moveTiles: () => {},
  getTiles: () => [],
  startGame: () => {},
  currentStep: 0,
  activeStep: 0,
  totalSteps: 1,
  isPreviewing: false,
  isTimelineLocked: false,
  previewTimelineStep: () => {},
  commitTimelinePreview: () => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const [previewStep, setPreviewStep] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const activeStep =
    isPreviewing && !isNil(previewStep) ? previewStep : gameState.historyIndex;
  const previewSnapshot = gameState.history[activeStep];
  const displayedState: GameSnapshot =
    isPreviewing && !isNil(previewSnapshot) ? previewSnapshot : gameState;

  const getEmptyCells = useCallback(() => {
    const results: [number, number][] = [];

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(gameState.board[y][x])) {
          results.push([x, y]);
        }
      }
    }

    return results;
  }, [gameState.board]);

  const appendRandomTile = useCallback(() => {
    const emptyCells = getEmptyCells();

    if (emptyCells.length > 0) {
      const cellIndex = Math.floor(Math.random() * emptyCells.length);
      dispatch({
        type: "create_tile",
        tile: {
          position: emptyCells[cellIndex],
          value: 2,
        },
      });
    }
  }, [getEmptyCells]);

  const getTiles = useCallback(() => {
    return displayedState.tilesByIds.map((tileId) => displayedState.tiles[tileId]);
  }, [displayedState]);

  const moveTiles = useMemo(
    () =>
      throttle(
        (type: MoveDirection) => {
          if (isPreviewing) {
            return;
          }

          dispatch({ type });
        },
        mergeAnimationDuration * 1.05,
        { trailing: false },
      ),
    [isPreviewing],
  );

  const startGame = useCallback(() => {
    setPreviewStep(null);
    setIsPreviewing(false);
    dispatch({
      type: "start_game",
      tiles: [
        { position: [0, 1], value: 2 },
        { position: [0, 2], value: 2 },
      ],
    });
  }, []);

  const previewTimelineStep = useCallback(
    (step: number) => {
      if (gameState.hasChanged) {
        return;
      }

      setPreviewStep(step);
      setIsPreviewing(true);
    },
    [gameState.hasChanged],
  );

  const commitTimelinePreview = useCallback(() => {
    if (isNil(previewStep)) {
      setIsPreviewing(false);
      return;
    }

    dispatch({ type: "jump_to_history", index: previewStep });
    setIsPreviewing(false);
    setPreviewStep(null);
  }, [previewStep]);

  const checkGameState = useCallback(() => {
    const tilesList = Object.values(gameState.tiles) as Tile[];
    const isWon = tilesList.filter((tile) => tile.value === gameWinTileValue).length > 0;

    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    const { tiles, board } = gameState;
    const maxIndex = tileCountPerDimension - 1;

    for (let x = 0; x < maxIndex; x += 1) {
      for (let y = 0; y < maxIndex; y += 1) {
        if (
          isNil(board[x][y]) ||
          isNil(board[x + 1][y]) ||
          isNil(board[x][y + 1])
        ) {
          return;
        }

        if (
          tiles[board[x][y] as string].value ===
          tiles[board[x + 1][y] as string].value
        ) {
          return;
        }

        if (
          tiles[board[x][y] as string].value ===
          tiles[board[x][y + 1] as string].value
        ) {
          return;
        }
      }
    }

    dispatch({ type: "update_status", status: "lost" });
  }, [gameState]);

  useEffect(() => {
    if (gameState.hasChanged) {
      const timeoutId = window.setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
      }, mergeAnimationDuration);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [appendRandomTile, gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [checkGameState, gameState.hasChanged]);

  useEffect(() => {
    return () => {
      moveTiles.cancel();
    };
  }, [moveTiles]);

  return (
    <GameContext.Provider
      value={{
        score: displayedState.score,
        status: displayedState.status,
        getTiles,
        moveTiles,
        startGame,
        currentStep: gameState.historyIndex,
        activeStep,
        totalSteps: gameState.history.length,
        isPreviewing,
        isTimelineLocked: gameState.hasChanged,
        previewTimelineStep,
        commitTimelinePreview,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
