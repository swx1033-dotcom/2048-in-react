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
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

type StateSnapshot = {
  board: string[][];
  tiles: Record<string, Tile>;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: string;
};

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  history: [] as StateSnapshot[],
  historyIndex: -1 as number,
  isPreviewing: false,
  jumpToState: (_: number) => {},
  confirmJump: () => {},
  setPreviewing: (_: boolean) => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const [isPreviewing, setIsPreviewing] = useState(false);

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

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => {
        if (gameState.status !== "ongoing") return;
        dispatch({ type });
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch, gameState.status],
  );

  const startGame = () => {
    dispatch({ type: "reset_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  };

  const jumpToState = useCallback(
    (index: number) => {
      dispatch({ type: "jump_to_state", index });
    },
    [dispatch],
  );

  const confirmJump = useCallback(() => {
    dispatch({ type: "confirm_jump" });
  }, [dispatch]);

  const setPreviewing = useCallback((value: boolean) => {
    setIsPreviewing(value);
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
        dispatch({ type: "record_snapshot" });
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
        getTiles,
        moveTiles,
        startGame,
        history: gameState.history,
        historyIndex: gameState.historyIndex,
        isPreviewing,
        jumpToState,
        confirmJump,
        setPreviewing,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}