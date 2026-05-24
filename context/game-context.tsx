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
  mergeAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  historyIndex: 0,
  historyLength: 0,
  previewIndex: null as number | null,
  previewHistory: (_: number) => {},
  confirmHistory: () => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

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
    const activeState = gameState.previewIndex !== null ? (gameState.history[gameState.previewIndex] || gameState) : gameState;
    return activeState.tilesByIds.map((tileId: string) => activeState.tiles[tileId]);
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
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
    dispatch({ type: "save_snapshot" });
  };

  const checkGameState = () => {
    const isWon =
      (Object.values(gameState.tiles) as Tile[]).filter((t: Tile) => t.value === gameWinTileValue)
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
        dispatch({ type: "save_snapshot" });
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged]);

  const previewHistory = (index: number) => dispatch({ type: "preview_history", index });
  const confirmHistory = () => dispatch({ type: "confirm_history" });

  return (
    <GameContext.Provider
      value={{
        score: gameState.previewIndex !== null ? gameState.history[gameState.previewIndex]?.score ?? gameState.score : gameState.score,
        status: gameState.previewIndex !== null ? gameState.history[gameState.previewIndex]?.status ?? gameState.status : gameState.status,
        getTiles,
        moveTiles,
        startGame,
        historyIndex: gameState.historyIndex,
        historyLength: gameState.history.length,
        previewIndex: gameState.previewIndex,
        previewHistory,
        confirmHistory,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
