import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
} from "react";
import { isNil, throttle } from "lodash";
import { mergeAnimationDuration, tileCountPerDimension } from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { GameStatus, initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

type GameContextValue = {
  score: number;
  status: GameStatus;
  moveTiles: (direction: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: () => void;
  continueGame: () => void;
};

export const GameContext = createContext<GameContextValue>({
  score: 0,
  status: "ongoing",
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  continueGame: () => {},
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
    return gameState.tilesByIds.map((tileId) => gameState.tiles[tileId]);
  };

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => {
        if (gameState.status !== "ongoing") {
          return;
        }

        dispatch({ type });
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [gameState.status],
  );

  const startGame = () => {
    dispatch({ type: "reset_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  };

  const continueGame = () => {
    dispatch({ type: "continue_game" });
  };

  useEffect(() => {
    if (!gameState.hasChanged) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "clean_up" });
      appendRandomTile();
    }, mergeAnimationDuration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [gameState.hasChanged]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        getTiles,
        moveTiles,
        startGame,
        continueGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
