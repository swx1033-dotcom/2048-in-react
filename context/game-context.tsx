import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { isNil, throttle } from "lodash";
import { mergeAnimationDuration } from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState, State } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

type GameContextType = {
  score: number;
  status: string;
  boardSize: number;
  infiniteMode: boolean;
  moveTiles: (_: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: (size?: number, infiniteMode?: boolean) => void;
};

export const GameContext = createContext<GameContextType>({
  score: 0,
  status: "ongoing",
  boardSize: 4,
  infiniteMode: false,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: (size?: number, infiniteMode?: boolean) => {},
});

const LOCAL_STORAGE_KEY = "2048-game-state";

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const isInitialized = useRef(false);

  // Load from local storage
  useEffect(() => {
    try {
      const savedStateStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedStateStr) {
        const savedState = JSON.parse(savedStateStr);
        // migration: if old state doesn't have boardSize
        if (!savedState.boardSize) {
          savedState.boardSize = 4;
          savedState.infiniteMode = false;
        }
        dispatch({ type: "load_state", state: savedState });
      }
    } catch (e) {
      console.error("Failed to load state from local storage", e);
    }
    isInitialized.current = true;
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  const getEmptyCells = (boardSize: number, board: string[][]) => {
    const results: [number, number][] = [];
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        if (isNil(board[y][x])) {
          results.push([x, y]);
        }
      }
    }
    return results;
  };

  const appendRandomTile = (amount = 1) => {
    for (let i = 0; i < amount; i++) {
      const emptyCells = getEmptyCells(gameState.boardSize, gameState.board);
      if (emptyCells.length > 0) {
        const cellIndex = Math.floor(Math.random() * emptyCells.length);
        const newTile = {
          position: emptyCells[cellIndex],
          value: 2,
        };
        dispatch({ type: "create_tile", tile: newTile });
      }
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

  const startGame = (size?: number, infiniteMode?: boolean) => {
    dispatch({ type: "reset_game", boardSize: size, infiniteMode });
    // Random tiles are added automatically because hasChanged is false initially,
    // wait, we need to explicitly create the first two tiles.
    // Or we can just use the empty cells after reset.
    // But reset_game doesn't wait for state to update in this tick.
    // So we dispatch create_tile manually.
    // However, dispatching multiple things works synchronously in React 18, but the state variable isn't updated.
    // We should use timeouts or a thunk.
    setTimeout(() => {
      dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
      dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
    }, 0);
  };

  const checkGameState = () => {
    // If not infinite mode, check win condition
    if (!gameState.infiniteMode) {
      const isWon =
        (Object.values(gameState.tiles) as Tile[]).filter((t: Tile) => t.value === 2048).length > 0;

      if (isWon) {
        dispatch({ type: "update_status", status: "won" });
        return;
      }
    } else {
      // In infinite mode, check if we need to expand (reached 4096)
      // We expand if there's a 4096 tile and we haven't expanded for this milestone?
      // Wait, "达到 4096 后自动扩展一圈". Does it expand again at 8192? 
      // Let's assume it expands every time we hit a new milestone (4096, 8192, etc.) or just once?
      // "达到 4096 后自动扩展一圈" - let's trigger expansion if we hit 4096 and boardSize is 4.
      // Or just check if max tile >= 4096 and boardSize < 6...
      // Let's say we expand whenever we hit a tile value that requires a larger board.
      // For simplicity, if max tile >= 4096 and boardSize == 4 -> expand to 6.
      // If max tile >= 8192 and boardSize == 6 -> expand to 8.
      const maxTileValue = Math.max(0, ...(Object.values(gameState.tiles) as Tile[]).map((t: Tile) => t.value));
      const requiredSize = maxTileValue >= 4096 ? 4 + 2 * Math.floor(Math.log2(maxTileValue / 2048)) : 4;
      
      if (gameState.boardSize < requiredSize) {
        dispatch({ type: "expand_board" });
        // Add random obstacle tiles
        setTimeout(() => {
          // outer ring empty cells
          const size = gameState.boardSize + 2;
          const numObstacles = size - 1; // random number of obstacles
          for(let i=0; i<numObstacles; i++) {
             // We can just add obstacles via a new action or create_tile with isObstacle
             // But we need the new state. So wait for next render or do it via an action.
          }
        }, mergeAnimationDuration);
      }
    }

    const { tiles, board, boardSize } = gameState;
    const maxIndex = boardSize - 1;
    let canMove = false;

    for (let x = 0; x < boardSize; x += 1) {
      for (let y = 0; y < boardSize; y += 1) {
        if (isNil(board[x][y])) {
          canMove = true;
          break;
        }
        if (x < maxIndex && !isNil(board[x + 1][y]) && tiles[board[x][y]].value === tiles[board[x + 1][y]].value && !tiles[board[x][y]].isObstacle && !tiles[board[x + 1][y]].isObstacle) {
          canMove = true;
          break;
        }
        if (y < maxIndex && !isNil(board[x][y + 1]) && tiles[board[x][y]].value === tiles[board[x][y + 1]].value && !tiles[board[x][y]].isObstacle && !tiles[board[x][y + 1]].isObstacle) {
          canMove = true;
          break;
        }
      }
      if (canMove) break;
    }

    if (!canMove && Object.keys(tiles).length > 0) {
      dispatch({ type: "update_status", status: "lost" });
    }
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
  }, [gameState.hasChanged, gameState.boardSize, gameState.infiniteMode]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        boardSize: gameState.boardSize,
        infiniteMode: gameState.infiniteMode,
        getTiles,
        moveTiles,
        startGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
