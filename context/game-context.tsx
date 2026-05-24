import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile, TileMap } from "@/models/tile";
import gameReducer, {
  gameReducerInitial,
  initialState,
} from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

type GameContextValue = {
  score: number;
  status: "ongoing" | "won" | "lost";
  moveTiles: (_: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: () => void;
  history: typeof initialState.history;
  historyIndex: number;
  isPreviewMode: boolean;
  jumpToHistory: (index: number) => void;
  setPreviewMode: (preview: boolean) => void;
};

export const GameContext = createContext<GameContextValue>({
  score: 0,
  status: "ongoing",
  moveTiles: () => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  history: [],
  historyIndex: -1,
  isPreviewMode: false,
  jumpToHistory: () => {},
  setPreviewMode: () => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const isPreviewModeRef = useRef(false);
  const previewTilesRef = useRef<Tile[]>([]);

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

  const getTiles = useCallback(() => {
    if (isPreviewModeRef.current) {
      return previewTilesRef.current;
    }
    return gameState.tilesByIds.map((tileId: string) => gameState.tiles[tileId]);
  }, [gameState.tiles, gameState.tilesByIds]);

  const pushHistory = useCallback(
    (state: typeof gameReducerInitial) => {
      dispatch({ type: "push_history", state });
    },
    [dispatch],
  );

  const jumpToHistory = useCallback(
    (index: number) => {
      dispatch({ type: "jump_to_history", historyIndex: index });
      isPreviewModeRef.current = false;
    },
    [dispatch],
  );

  const setPreviewMode = useCallback((preview: boolean) => {
    isPreviewModeRef.current = preview;
  }, []);

  const updatePreviewTiles = useCallback(
    (index: number) => {
      if (index >= 0 && index < gameState.history.length) {
        const targetState = gameState.history[index];
        previewTilesRef.current = targetState.tilesByIds.map(
          (tileId: string) => targetState.tiles[tileId],
        );
      } else if (index === -1) {
        previewTilesRef.current = [];
      }
    },
    [gameState.history],
  );

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => {
        if (isPreviewModeRef.current) {
          return;
        }

        const currentGameState: typeof gameReducerInitial = {
          board: gameState.board,
          tiles: gameState.tiles,
          tilesByIds: gameState.tilesByIds,
          hasChanged: gameState.hasChanged,
          score: gameState.score,
          status: gameState.status,
        };
        pushHistory(currentGameState);
        dispatch({ type });
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch, pushHistory, gameState],
  );

  const startGame = () => {
    dispatch({ type: "reset_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  };

  const checkGameState = useCallback(() => {
    const tiles = isPreviewModeRef.current
      ? previewTilesRef.current.reduce(
          (acc: Record<string, Tile>, tile: Tile) => {
            if (tile.id) {
              acc[tile.id] = tile;
            }
            return acc;
          },
          {} as Record<string, Tile>,
        )
      : gameState.tiles;
    const board = isPreviewModeRef.current
      ? gameState.history[gameState.historyIndex]?.board || gameState.board
      : gameState.board;

    if (isNil(tiles) || Object.keys(tiles).length === 0) {
      return;
    }

    const isWon = Object.values(tiles as TileMap).some(
      (t: Tile) => t.value === gameWinTileValue,
    );

    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    const maxIndex = tileCountPerDimension - 1;
    for (let x = 0; x < maxIndex; x += 1) {
      for (let y = 0; y < maxIndex; y += 1) {
        if (isNil(board[x][y]) || isNil(board[x + 1][y]) || isNil(board[x][y + 1])) {
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
  }, [dispatch, gameState]);

  useEffect(() => {
    if (gameState.hasChanged && !isPreviewModeRef.current) {
      const timeoutId = setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
      }, mergeAnimationDuration);
      return () => clearTimeout(timeoutId);
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged && !isPreviewModeRef.current) {
      checkGameState();
    }
  }, [gameState.hasChanged, checkGameState]);

  const contextValue = useMemo<GameContextValue>(
    () => ({
      score: gameState.score,
      status: gameState.status,
      getTiles,
      moveTiles,
      startGame,
      history: gameState.history,
      historyIndex: gameState.historyIndex,
      isPreviewMode: isPreviewModeRef.current,
      jumpToHistory,
      setPreviewMode,
    }),
    [
      gameState.score,
      gameState.status,
      gameState.history,
      gameState.historyIndex,
      getTiles,
      moveTiles,
      startGame,
      jumpToHistory,
    ],
  );

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}
