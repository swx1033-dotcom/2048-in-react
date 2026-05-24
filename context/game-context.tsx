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
import { withChallenges } from "@/reducers/challenge-enhancer";
import { obstaclePlugin, decayPlugin, mergeLimitPlugin, disableDirectionPlugin, countdownPlugin } from "@/reducers/plugins";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  challengeState: initialState.challengeState,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  updateConfig: (_: any) => {},
});

export function withUndo(reducer: any) {
  return function (state: any, action: any) {
    if (action.type === "undo") {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return { past: newPast, present: previous, future: [state.present, ...state.future] };
    }
    if (action.type === "redo") {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return { past: [...state.past, state.present], present: next, future: newFuture };
    }
    
    const newPresent = reducer(state.present, action);
    if (newPresent === state.present) return state;

    if (action.type.startsWith("move_") || action.type === "reset_game") {
      return { past: [...state.past, state.present], present: newPresent, future: [] };
    }
    return { ...state, present: newPresent };
  }
}

const rootReducer = withUndo(withChallenges(gameReducer, [
  obstaclePlugin,
  decayPlugin,
  mergeLimitPlugin,
  disableDirectionPlugin,
  countdownPlugin
]));

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameStateWrapper, dispatch] = useReducer(rootReducer, { past: [], present: initialState, future: [] }, (init) => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("2048-state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          let loadedPresent = parsed;
          let loadedPast = [];
          let loadedFuture = [];

          if (parsed.present) {
            loadedPresent = parsed.present;
            loadedPast = parsed.past || [];
            loadedFuture = parsed.future || [];
          }

          return {
            past: loadedPast,
            present: {
              ...init.present,
              ...loadedPresent,
              challengeState: {
                ...init.present.challengeState,
                ...loadedPresent.challengeState,
                config: {
                  ...init.present.challengeState?.config,
                  ...loadedPresent.challengeState?.config
                }
              }
            },
            future: loadedFuture
          };
        } catch (e) {}
      }
    }
    return init;
  });

  const gameState = gameStateWrapper.present;

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("2048-state", JSON.stringify(gameStateWrapper));
    }
  }, [gameStateWrapper]);

  useEffect(() => {
    if (gameState.challengeState?.config?.countdown?.enabled && gameState.status === "ongoing") {
      const timer = setInterval(() => {
        dispatch({ type: "plugin_action", payload: { type: "tick" } });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.challengeState?.config?.countdown?.enabled, gameState.status]);

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

        if (
          tiles[board[x][y]].value === tiles[board[x + 1][y]].value &&
          !tiles[board[x][y]].isObstacle
        ) {
          return;
        }

        if (
          tiles[board[x][y]].value === tiles[board[x][y + 1]].value &&
          !tiles[board[x][y]].isObstacle
        ) {
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

  const updateConfig = (config: any) => {
    dispatch({ type: "update_config", config });
  };

  const undo = () => dispatch({ type: "undo" });
  const redo = () => dispatch({ type: "redo" });

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        challengeState: gameState.challengeState,
        getTiles,
        moveTiles,
        startGame,
        updateConfig,
        undo,
        redo,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
