import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  moveAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  isAutoPlaying: false,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  startAutoPlay: () => {},
  stopAutoPlay: () => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayDelay = 500; // ms
  const animationWaitTime = mergeAnimationDuration + moveAnimationDuration;

  const directions: MoveDirection[] = [
    "move_up",
    "move_down",
    "move_left",
    "move_right",
  ];

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
  };

  const startAutoPlay = useCallback(() => {
    setIsAutoPlaying(true);
    
    const autoPlay = () => {
      const randomIndex = Math.floor(Math.random() * directions.length);
      moveTiles(directions[randomIndex]);
    };
    
    autoPlayIntervalRef.current = setInterval(() => {
      autoPlay();
    }, autoPlayDelay);
  }, [moveTiles]);

  const stopAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
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
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (gameState.status !== "ongoing") {
      stopAutoPlay();
    }
  }, [gameState.status, stopAutoPlay]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        isAutoPlaying,
        getTiles,
        moveTiles,
        startGame,
        startAutoPlay,
        stopAutoPlay,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
