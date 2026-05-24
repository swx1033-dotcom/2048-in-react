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
  defaultBoardSize,
  infiniteModeExpansionThreshold,
  localStorageKey,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  boardSize: defaultBoardSize,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
});

function migrateSavedState(savedState: any) {
  if (!savedState) return null;

  if (!savedState.boardSize) {
    savedState.boardSize = defaultBoardSize;
  }

  if (savedState.tiles) {
    for (const id of Object.keys(savedState.tiles)) {
      if (savedState.tiles[id].isObstacle === undefined) {
        savedState.tiles[id].isObstacle = false;
      }
    }
  }

  return savedState;
}

function loadStateFromLocalStorage() {
  try {
    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return migrateSavedState(parsed);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveStateToLocalStorage(state: any) {
  try {
    localStorage.setItem(localStorageKey, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getInitialState() {
  const saved = loadStateFromLocalStorage();
  if (saved && saved.board && saved.tiles && saved.tilesByIds) {
    return {
      ...initialState,
      ...saved,
      hasChanged: false,
    };
  }
  return initialState;
}

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, undefined, getInitialState);
  const hasExpandedRef = useRef(false);

  const getBoardSize = () => gameState.boardSize;

  const getEmptyCells = () => {
    const size = getBoardSize();
    const results: [number, number][] = [];

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

  const getTiles = () => {
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

  const startGame = () => {
    dispatch({ type: "reset_game" });
    hasExpandedRef.current = false;
    setTimeout(() => {
      dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
      dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
    }, 0);
  };

  const checkForExpansion = () => {
    if (hasExpandedRef.current) return;

    const tiles = Object.values(gameState.tiles) as Tile[];
    const maxTileValue = Math.max(
      ...tiles.map((t) => t.value),
      0,
    );

    if (maxTileValue >= infiniteModeExpansionThreshold) {
      const currentSize = getBoardSize();
      const newSize = currentSize + 1;
      const obstacleTiles: [number, number][] = [];

      const newCells: [number, number][] = [];
      for (let x = 0; x < newSize; x++) {
        if (x >= currentSize) {
          for (let y = 0; y < newSize; y++) {
            newCells.push([x, y]);
          }
        } else {
          for (let y = currentSize; y < newSize; y++) {
            newCells.push([x, y]);
          }
        }
      }

      const obstacleCount = Math.max(1, Math.floor(newCells.length / 4));
      const shuffled = newCells.sort(() => Math.random() - 0.5);
      for (let i = 0; i < obstacleCount && i < shuffled.length; i++) {
        obstacleTiles.push(shuffled[i]);
      }

      dispatch({ type: "expand_board", newSize, obstacleTiles });
      hasExpandedRef.current = true;
    }
  };

  const checkGameState = () => {
    const isWon =
      (Object.values(gameState.tiles) as Tile[]).filter((t) => t.value === gameWinTileValue)
        .length > 0;

    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    const { tiles, board } = gameState;
    const size = getBoardSize();

    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        if (isNil(board[y][x])) {
          return;
        }

        const currentTile = tiles[board[y][x]];
        if (currentTile?.isObstacle) continue;

        if (x + 1 < size && !isNil(board[y][x + 1])) {
          const rightTile = tiles[board[y][x + 1]];
          if (
            !rightTile?.isObstacle &&
            currentTile.value === rightTile.value
          ) {
            return;
          }
        }

        if (y + 1 < size && !isNil(board[y + 1]?.[x])) {
          const downTile = tiles[board[y + 1][x]];
          if (
            !downTile?.isObstacle &&
            currentTile.value === downTile.value
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
      checkForExpansion();
      checkGameState();
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    saveStateToLocalStorage(gameState);
  }, [gameState]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        boardSize: gameState.boardSize,
        getTiles,
        moveTiles,
        startGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
