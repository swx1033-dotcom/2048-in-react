import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  infiniteModeThreshold,
  mergeAnimationDuration,
  defaultBoardSize,
} from "@/constants";
import { GameMode, Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

const LOCAL_STORAGE_KEY = "2048-game-state";

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  boardSize: defaultBoardSize,
  mode: "classic" as GameMode,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: (_boardSize?: number, _mode?: GameMode) => {},
});

function migrateState(savedState: any): any {
  if (savedState.boardSize === undefined) {
    savedState.boardSize = savedState.board
      ? savedState.board.length
      : defaultBoardSize;
  }
  if (savedState.mode === undefined) {
    savedState.mode = "classic";
  }
  return savedState;
}

function hasTileReachedThreshold(
  tiles: { [id: string]: Tile },
  threshold: number,
) {
  return Object.values(tiles).some((t) => t.value >= threshold);
}

export default function GameProvider({ children }: PropsWithChildren) {
  const loadGameState = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return initialState;
      const parsed = migrateState(JSON.parse(raw));
      return {
        ...initialState,
        ...parsed,
        hasChanged: false,
        board: Array.isArray(parsed.board) ? parsed.board : initialState.board,
      };
    } catch {
      return initialState;
    }
  };

  const [gameState, dispatch] = useReducer(gameReducer, null, () =>
    loadGameState(),
  );

  useEffect(() => {
    if (gameState !== initialState) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  const getEmptyCells = () => {
    const results: [number, number][] = [];
    const size = gameState.boardSize;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
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

  const getTiles = (): Tile[] => {
    return gameState.tilesByIds.map((tileId: string) => gameState.tiles[tileId]);
  };

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => dispatch({ type }),
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch],
  );

  const startGame = useCallback(
    (boardSize?: number, mode?: GameMode) => {
      dispatch({ type: "reset_game", boardSize, mode });
      dispatch({
        type: "create_tile",
        tile: { position: [0, 1], value: 2 },
      });
      dispatch({
        type: "create_tile",
        tile: { position: [0, 2], value: 2 },
      });
    },
    [dispatch],
  );

  const checkGameState = () => {
    const tilesArray: Tile[] = Object.values(gameState.tiles);
    const isWon =
      tilesArray.filter(
        (t) => !t.isObstacle && t.value === gameWinTileValue,
      ).length > 0;

    if (isWon && gameState.mode !== "infinite") {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    if (
      gameState.mode === "infinite" &&
      hasTileReachedThreshold(gameState.tiles, infiniteModeThreshold)
    ) {
      dispatch({ type: "expand_board" });
      return;
    }

    const { tiles, board, boardSize } = gameState;
    const size = boardSize;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNil(board[y][x])) {
          return;
        }

        if (x + 1 < size && !isNil(board[y][x + 1])) {
          const current = tiles[board[y][x]];
          const right = tiles[board[y][x + 1]];
          if (
            !current.isObstacle &&
            !right.isObstacle &&
            current.value === right.value
          ) {
            return;
          }
        }

        if (y + 1 < size && !isNil(board[y + 1][x])) {
          const current = tiles[board[y][x]];
          const below = tiles[board[y + 1][x]];
          if (
            !current.isObstacle &&
            !below.isObstacle &&
            current.value === below.value
          ) {
            return;
          }
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

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        boardSize: gameState.boardSize,
        mode: gameState.mode,
        getTiles,
        moveTiles,
        startGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}