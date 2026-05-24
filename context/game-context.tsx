import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  defaultTileCountPerDimension,
  infiniteModeThreshold,
  BoardSize,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

const STORAGE_KEY = "2048-game-state";

export const GameContext = createContext({
  score: 0,
  status: "ongoing" as "ongoing" | "won" | "lost",
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: (boardSize?: BoardSize) => {},
  boardSize: defaultTileCountPerDimension,
  isInfiniteMode: false,
});

function migrateOldState(oldState: any): any {
  if (!oldState) return null;
  if (oldState.boardSize) return oldState;
  
  return {
    ...oldState,
    boardSize: defaultTileCountPerDimension,
    isInfiniteMode: false,
    previousScore: 0,
  };
}

function loadSavedState(): any {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return migrateOldState(JSON.parse(saved));
    }
  } catch (e) {
    console.error("Failed to load game state", e);
  }
  return null;
}

function saveState(state: any): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save game state", e);
  }
}

export default function GameProvider({ children }: PropsWithChildren) {
  const [savedState] = useState(() => loadSavedState());
  const [gameState, dispatch] = useReducer(
    gameReducer,
    savedState || initialState
  );

  const getEmptyCells = useCallback(() => {
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
  }, [gameState.board, gameState.boardSize]);

  const appendRandomTile = useCallback(() => {
    const emptyCells = getEmptyCells();
    if (emptyCells.length > 0) {
      const cellIndex = Math.floor(Math.random() * emptyCells.length);
      const newTile = {
        position: emptyCells[cellIndex],
        value: Math.random() < 0.9 ? 2 : 4,
      };
      dispatch({ type: "create_tile", tile: newTile });
    }
  }, [getEmptyCells]);

  const generateRandomObstacles = useCallback((newSize: number): Tile[] => {
    const obstacles: Tile[] = [];
    const obstacleCount = Math.min(Math.floor(newSize / 2), 4);
    
    const perimeterCells: [number, number][] = [];
    
    for (let x = 0; x < newSize; x++) {
      perimeterCells.push([x, 0]);
      perimeterCells.push([x, newSize - 1]);
    }
    
    for (let y = 1; y < newSize - 1; y++) {
      perimeterCells.push([0, y]);
      perimeterCells.push([newSize - 1, y]);
    }
    
    const shuffled = [...perimeterCells].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < obstacleCount && i < shuffled.length; i++) {
      obstacles.push({
        position: shuffled[i],
        value: 0,
        isObstacle: true,
      });
    }
    
    return obstacles;
  }, []);

  const checkAndExpandBoard = useCallback(() => {
    if (!gameState.isInfiniteMode) return;
    
    const hasReachedThreshold = Object.values(gameState.tiles).some(
      (tile) => !tile.isObstacle && tile.value >= infiniteModeThreshold
    );
    
    if (hasReachedThreshold) {
      const obstacles = generateRandomObstacles(gameState.boardSize + 2);
      dispatch({ type: "expand_board", obstacles });
    }
  }, [gameState.isInfiniteMode, gameState.tiles, gameState.boardSize, generateRandomObstacles]);

  const getTiles = useCallback(() => {
    return gameState.tilesByIds.map((tileId) => gameState.tiles[tileId]);
  }, [gameState.tilesByIds, gameState.tiles]);

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => dispatch({ type }),
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch],
  );

  const startGame = useCallback((boardSize: BoardSize = defaultTileCountPerDimension) => {
    const isInfinite = boardSize === 'infinite';
    const size = isInfinite ? defaultTileCountPerDimension : boardSize;
    
    dispatch({ type: "reset_game", boardSize: size, isInfiniteMode: isInfinite });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  }, []);

  const checkGameState = useCallback(() => {
    const isWon =
      Object.values(gameState.tiles).filter((t) => !t.isObstacle && t.value === gameWinTileValue)
        .length > 0;

    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    const { tiles, board, boardSize } = gameState;

    const size = boardSize;
    
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        if (isNil(board[y][x])) {
          return;
        }
      }
    }

    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        const currentTileId = board[y][x];
        if (!currentTileId) continue;
        
        const currentTile = tiles[currentTileId];
        if (currentTile.isObstacle) continue;

        if (x < size - 1) {
          const rightTileId = board[y][x + 1];
          if (rightTileId) {
            const rightTile = tiles[rightTileId];
            if (!rightTile.isObstacle && currentTile.value === rightTile.value) {
              return;
            }
          }
        }

        if (y < size - 1) {
          const downTileId = board[y + 1][x];
          if (downTileId) {
            const downTile = tiles[downTileId];
            if (!downTile.isObstacle && currentTile.value === downTile.value) {
              return;
            }
          }
        }
      }
    }

    dispatch({ type: "update_status", status: "lost" });
  }, [gameState.tiles, gameState.board, gameState.boardSize]);

  useEffect(() => {
    if (gameState.hasChanged) {
      setTimeout(() => {
        dispatch({ type: "clean_up" });
        checkAndExpandBoard();
        appendRandomTile();
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged, appendRandomTile, checkAndExpandBoard]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged, checkGameState]);

  useEffect(() => {
    saveState(gameState);
  }, [gameState]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        getTiles,
        moveTiles,
        startGame,
        boardSize: gameState.boardSize,
        isInfiniteMode: gameState.isInfiniteMode,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
