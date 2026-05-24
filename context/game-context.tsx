import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { throttle } from "lodash";
import {
  expansionObstacleCount,
  gameModeLabels,
  gameStateStorageKey,
  gameWinTileValue,
  mergeAnimationDuration,
  moveAnimationDuration,
} from "@/constants";
import { GameMode, Tile } from "@/models/tile";
import gameReducer, {
  GameStatus,
  MoveDirection,
  buildExpandedPreviewBoard,
  canMove,
  cleanupState,
  getPerimeterPositions,
  initialState,
  migratePersistedState,
  shouldExpandBoard,
} from "@/reducers/game-reducer";

type GameModeOption = {
  mode: GameMode;
  label: string;
};

type GameContextValue = {
  score: number;
  status: GameStatus;
  dimension: number;
  mode: GameMode;
  moveTiles: (_: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: (_mode?: GameMode) => void;
  initializeGame: () => void;
  setMode: (_mode: GameMode) => void;
  availableModes: GameModeOption[];
};

const availableModes: GameModeOption[] = Object.entries(gameModeLabels).map(
  ([mode, label]) => ({
    mode: mode as GameMode,
    label,
  }),
);

export const GameContext = createContext<GameContextValue>({
  score: 0,
  status: "ongoing",
  dimension: initialState.dimension,
  mode: initialState.mode,
  moveTiles: () => {},
  getTiles: () => [],
  startGame: () => {},
  initializeGame: () => {},
  setMode: () => {},
  availableModes,
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const initialized = useRef(false);
  const statusRef = useRef(gameState.status);

  useEffect(() => {
    statusRef.current = gameState.status;
  }, [gameState.status]);

  const getEmptyCells = useCallback((board = gameState.board) => {
    const results: [number, number][] = [];

    for (let y = 0; y < board.length; y += 1) {
      for (let x = 0; x < board[y].length; x += 1) {
        if (!board[y][x]) {
          results.push([x, y]);
        }
      }
    }

    return results;
  }, [gameState.board]);

  const createRandomTile = useCallback(
    (board = gameState.board) => {
      const emptyCells = getEmptyCells(board);

      if (emptyCells.length === 0) {
        return undefined;
      }

      const cellIndex = Math.floor(Math.random() * emptyCells.length);

      return {
        position: emptyCells[cellIndex],
        value: 2,
      } as Tile;
    },
    [gameState.board, getEmptyCells],
  );

  const getTiles = useCallback(() => {
    return gameState.tilesByIds.map((tileId: string) => gameState.tiles[tileId]);
  }, [gameState.tiles, gameState.tilesByIds]);

  const seedTiles = useCallback(
    (mode: GameMode) => {
      const seededPositions: [number, number][] = [
        [0, 1],
        [0, 2],
      ];

      dispatch({ type: "reset_game", mode });
      seededPositions.forEach((position) => {
        dispatch({ type: "create_tile", tile: { position, value: 2 } });
      });
    },
    [dispatch],
  );

  const startGame = useCallback(
    (mode: GameMode = gameState.mode) => {
      seedTiles(mode);
    },
    [gameState.mode, seedTiles],
  );

  const initializeGame = useCallback(() => {
    if (initialized.current || typeof window === "undefined") {
      return;
    }

    initialized.current = true;

    try {
      const rawState = window.localStorage.getItem(gameStateStorageKey);

      if (rawState) {
        const parsedState = JSON.parse(rawState);
        const migratedState = migratePersistedState(parsedState);

        if (migratedState) {
          dispatch({ type: "hydrate_state", state: migratedState });
          return;
        }
      }
    } catch {
    }

    seedTiles(initialState.mode);
  }, [seedTiles]);

  const setMode = useCallback(
    (mode: GameMode) => {
      startGame(mode);
    },
    [startGame],
  );

  const moveTiles = useMemo(
    () =>
      throttle(
        (type: MoveDirection) => {
          if (statusRef.current !== "ongoing") {
            return;
          }

          dispatch({ type });
        },
        moveAnimationDuration,
        { trailing: false },
      ),
    [dispatch],
  );

  useEffect(() => {
    return () => {
      moveTiles.cancel();
    };
  }, [moveTiles]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const cleanedState = cleanupState(gameState);
      const needsExpansion = shouldExpandBoard(cleanedState);
      const obstaclePositions = needsExpansion
        ? getPerimeterPositions(cleanedState.dimension + 2)
            .sort(() => Math.random() - 0.5)
            .slice(0, expansionObstacleCount)
        : [];
      const boardAfterExpansion = needsExpansion
        ? buildExpandedPreviewBoard(cleanedState, obstaclePositions)
        : cleanedState.board;
      const nextTile = createRandomTile(boardAfterExpansion);
      const expansion = needsExpansion
        ? {
            obstacleTiles: obstaclePositions.map((position) => ({
              position,
              value: 0,
              kind: "obstacle" as const,
            })),
            nextExpansionValue: cleanedState.nextExpansionValue * 2,
          }
        : undefined;

      dispatch({ type: "finalize_turn", tile: nextTile, expansion });
    }, mergeAnimationDuration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [createRandomTile, gameState]);

  useEffect(() => {
    if (gameState.hasChanged) {
      return;
    }

    if (gameState.mode !== "infinite") {
      const tiles = Object.values(gameState.tiles) as Tile[];
      const hasWinningTile = tiles.some((tile) => {
        return (tile.kind ?? "number") === "number" && tile.value >= gameWinTileValue;
      });

      if (hasWinningTile && gameState.status !== "won") {
        dispatch({ type: "update_status", status: "won" });
        return;
      }
    }

    if (!canMove(gameState) && gameState.status !== "lost") {
      dispatch({ type: "update_status", status: "lost" });
    }
  }, [gameState]);

  useEffect(() => {
    if (!initialized.current || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      gameStateStorageKey,
      JSON.stringify(cleanupState(gameState)),
    );
  }, [gameState]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        dimension: gameState.dimension,
        mode: gameState.mode,
        getTiles,
        moveTiles,
        startGame,
        initializeGame,
        setMode,
        availableModes: Object.entries(gameModeLabels).map(([mode, label]) => ({
          mode: mode as GameMode,
          label,
        })),
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
