import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import { ChallengeEffect, GameState, MoveDirection } from "@/models/challenge";
import { ChallengeContext } from "@/context/challenge-context";
import gameReducer, { initialState } from "@/reducers/game-reducer";

export { type MoveDirection } from "@/models/challenge";

export const GameContext = createContext({
  score: 0,
  status: "ongoing" as const,
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  undoMove: () => {},
});

function toGameState(state: typeof initialState): GameState {
  return {
    board: state.board,
    tiles: state.tiles,
    tilesByIds: state.tilesByIds,
    hasChanged: state.hasChanged,
    score: state.score,
    status: state.status,
  };
}

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const {
    processBeforeAction,
    processAfterMove,
    processCheckGameOver,
    saveHistory,
    undo,
    updatePluginState,
    challengeState,
  } = useContext(ChallengeContext);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const getEmptyCells = useCallback(() => {
    const results: [number, number][] = [];
    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(gameStateRef.current.board[y][x])) {
          results.push([x, y]);
        }
      }
    }
    return results;
  }, []);

  const appendRandomTile = useCallback(() => {
    const emptyCells = getEmptyCells();
    if (emptyCells.length > 0) {
      const cellIndex = Math.floor(Math.random() * emptyCells.length);
      dispatch({ type: "create_tile", tile: { position: emptyCells[cellIndex], value: 2 } });
    }
  }, [getEmptyCells]);

  const applyChallengeEffects = useCallback(
    (effects: ChallengeEffect[]) => {
      for (const effect of effects) {
        switch (effect.type) {
          case "create_tile":
            dispatch({
              type: "create_tile",
              tile: effect.payload.tile as Tile,
            });
            break;
          case "update_tile":
            dispatch({
              type: "update_tile",
              tileId: effect.payload.tileId as string,
              value: effect.payload.value as number,
            });
            break;
          case "remove_tile":
            dispatch({
              type: "remove_tile",
              tileId: effect.payload.tileId as string,
            });
            break;
          case "set_plugin_state": {
            const pluginId = effect.payload.pluginId as string;
            const pluginState = effect.payload.state as Record<string, unknown>;
            if (pluginId && pluginState) {
              updatePluginState(pluginId, pluginState);
            }
            break;
          }
        }
      }
    },
    [updatePluginState],
  );

  const getTiles = useCallback(() => {
    return gameState.tilesByIds.map((tileId) => gameState.tiles[tileId]);
  }, [gameState.tilesByIds, gameState.tiles]);

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => {
        const gs = toGameState(gameStateRef.current);

        const processedAction = processBeforeAction({ type }, gs);
        if (processedAction === null) return;

        saveHistory(gs);
        dispatch({ type: processedAction.type as MoveDirection });
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch, processBeforeAction, saveHistory],
  );

  const startGame = useCallback(() => {
    dispatch({ type: "reset_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  }, []);

  const undoMove = useCallback(() => {
    const entry = undo();
    if (entry) {
      dispatch({ type: "restore_state", state: entry.gameState as typeof initialState });
    }
  }, [undo]);

  const checkGameState = useCallback(() => {
    const gs = toGameState(gameStateRef.current);

    const challengeGameOver = processCheckGameOver(gs);
    if (challengeGameOver) {
      dispatch({ type: "update_status", status: "lost" });
      return;
    }

    const isWon =
      Object.values(gameStateRef.current.tiles).filter(
        (t) => t.value === gameWinTileValue,
      ).length > 0;

    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    const { tiles, board } = gameStateRef.current;

    const maxIndex = tileCountPerDimension - 1;
    for (let x = 0; x < maxIndex; x += 1) {
      for (let y = 0; y < maxIndex; y += 1) {
        if (
          isNil(gameStateRef.current.board[x][y]) ||
          isNil(gameStateRef.current.board[x + 1][y]) ||
          isNil(gameStateRef.current.board[x][y + 1])
        ) {
          return;
        }

        const currentTile = tiles[board[x][y]];
        const rightTile = tiles[board[x + 1][y]];
        const downTile = tiles[board[x][y + 1]];

        if (!currentTile.isObstacle && !rightTile.isObstacle && currentTile.value === rightTile.value) {
          return;
        }

        if (!currentTile.isObstacle && !downTile.isObstacle && currentTile.value === downTile.value) {
          return;
        }
      }
    }

    dispatch({ type: "update_status", status: "lost" });
  }, [processCheckGameOver]);

  const afterCleanUpRef = useRef(false);

  useEffect(() => {
    if (gameState.hasChanged) {
      afterCleanUpRef.current = true;
      setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged, appendRandomTile]);

  useEffect(() => {
    if (!gameState.hasChanged && afterCleanUpRef.current) {
      afterCleanUpRef.current = false;

      if (challengeState.isChallengeMode) {
        const gs = toGameState(gameStateRef.current);
        const effects = processAfterMove(gs);
        applyChallengeEffects(effects);
      }

      checkGameState();
    }
  }, [gameState.hasChanged, challengeState.isChallengeMode, processAfterMove, applyChallengeEffects, checkGameState]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        getTiles,
        moveTiles,
        startGame,
        undoMove,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
