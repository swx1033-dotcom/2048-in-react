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
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import {
  ChallengeConfig,
  ChallengeState,
  Direction,
  defaultChallengeState,
  GameState,
  PluginAction,
} from "@/models/challenge";
import gameReducer, { initialState } from "@/reducers/game-reducer";
import {
  allChallengePlugins,
  createPluginManager,
  serializeChallengeState,
  deserializeChallengeState,
} from "@/challenge";
import { ChallengePlugin } from "@/challenge/types";

type MoveDirection = Direction;

type ChallengeContextType = {
  score: number;
  status: string;
  moveTiles: (_: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: () => void;
  challengeState: ChallengeState;
  challengeConfigs: Record<string, ChallengeConfig>;
  setChallengeConfig: (id: string, config: ChallengeConfig) => void;
  availablePlugins: ChallengePlugin[];
};

export const GameContext = createContext<ChallengeContextType>({
  score: 0,
  status: "ongoing",
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [],
  startGame: () => {},
  challengeState: defaultChallengeState,
  challengeConfigs: {},
  setChallengeConfig: (_: string, _config: ChallengeConfig) => {},
  availablePlugins: [],
});

function migrateOldSave(raw: string): {
  gameState: GameState | null;
  challengeState: ChallengeState;
  challengeConfigs: Record<string, ChallengeConfig>;
} | null {
  try {
    const data = JSON.parse(raw);

    if (data && data.challengeState) {
      return {
        gameState: data.gameState || null,
        challengeState: deserializeChallengeState(data.challengeState),
        challengeConfigs: data.challengeConfigs || {},
      };
    }

    const gameState = data as GameState;
    if (gameState && gameState.board && gameState.tiles) {
      return {
        gameState,
        challengeState: defaultChallengeState,
        challengeConfigs: {},
      };
    }

    return null;
  } catch {
    return null;
  }
}

const STORAGE_KEY = "2048-game-state";

function loadState(): {
  gameState: GameState | null;
  challengeState: ChallengeState;
  challengeConfigs: Record<string, ChallengeConfig>;
} {
  if (typeof window === "undefined") {
    return {
      gameState: null,
      challengeState: defaultChallengeState,
      challengeConfigs: {},
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const result = migrateOldSave(raw);
      if (result) return result;
    }
  } catch {
    // Silently ignore corrupted saves
  }

  return {
    gameState: null,
    challengeState: defaultChallengeState,
    challengeConfigs: {},
  };
}

function saveState(
  gameState: GameState,
  challengeState: ChallengeState,
  challengeConfigs: Record<string, ChallengeConfig>,
): void {
  if (typeof window === "undefined") return;
  try {
    const data = {
      gameState,
      challengeState: serializeChallengeState(challengeState),
      challengeConfigs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently ignore storage errors
  }
}

const pluginManager = createPluginManager(allChallengePlugins);

function applyPluginActions(
  dispatch: ReturnType<typeof useReducer>[1],
  actions: PluginAction[],
): void {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    switch (action.type) {
      case "create_tile":
        dispatch({ type: "create_tile", tile: action.tile });
        break;
      case "update_tiles":
        dispatch({ type: "update_tiles", tiles: action.tiles });
        break;
    }
  }
}

export default function GameProvider({ children }: PropsWithChildren) {
  const saved = loadState();
  const [gameState, dispatch] = useReducer(
    gameReducer,
    saved.gameState || initialState,
  );
  const [challengeState, setChallengeState] = useState<ChallengeState>(
    saved.challengeState,
  );
  const [challengeConfigs, setChallengeConfigs] = useState<
    Record<string, ChallengeConfig>
  >(saved.challengeConfigs);
  const turnCountRef = useRef(0);
  const lastDirectionRef = useRef<Direction>("move_up");
  const obstaclePositionsRef = useRef<Set<string>>(
    saved.challengeState.obstaclePositions,
  );
  const gameStateRef = useRef<GameState>(
    saved.gameState || initialState as GameState,
  );

  gameStateRef.current = gameState as GameState;

  const updateChallengeState = useCallback(
    (next: ChallengeState | ((prev: ChallengeState) => ChallengeState)) => {
      setChallengeState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        obstaclePositionsRef.current = resolved.obstaclePositions;
        return resolved;
      });
    },
    [],
  );

  const setChallengeConfig = useCallback(
    (id: string, config: ChallengeConfig) => {
      setChallengeConfigs((prev) => ({
        ...prev,
        [id]: config,
      }));
    },
    [],
  );

  const getEmptyCells = useCallback(() => {
    const results: [number, number][] = [];
    const state = gameStateRef.current;
    const obsPositions = obstaclePositionsRef.current;

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (
          isNil(state.board[y][x]) &&
          !obsPositions.has(`${x},${y}`)
        ) {
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
      const newTile = {
        position: emptyCells[cellIndex],
        value: 2,
      };
      dispatch({ type: "create_tile", tile: newTile });
    }
  }, [getEmptyCells]);

  const getTiles = useCallback(() => {
    return gameState.tilesByIds.map((tileId) => gameState.tiles[tileId]);
  }, [gameState.tilesByIds, gameState.tiles]);

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => {
        const gameStateTyped = gameState as GameState;

        const disabledDirs = pluginManager.getDisabledDirections(
          gameStateTyped,
          challengeState,
          turnCountRef.current,
          challengeConfigs,
        );

        if (disabledDirs.indexOf(type) !== -1) {
          return;
        }

        const beforeResult = pluginManager.runBeforeMove(
          gameStateTyped,
          challengeState,
          type,
          turnCountRef.current,
          challengeConfigs,
        );

        if (beforeResult.blocked) {
          return;
        }

        updateChallengeState(beforeResult.challenge);
        applyPluginActions(dispatch, beforeResult.actions);
        lastDirectionRef.current = type;

        dispatch({ type });
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [gameState, challengeState, challengeConfigs],
  );

  const startGame = useCallback(() => {
    dispatch({ type: "reset_game" });
    updateChallengeState(defaultChallengeState);
    turnCountRef.current = 0;
    lastDirectionRef.current = "move_up";
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  }, []);

  useEffect(() => {
    if (gameState.hasChanged) {
      turnCountRef.current += 1;

      setTimeout(() => {
        dispatch({ type: "clean_up" });

        const currentGameState = gameStateRef.current;

        const afterResult = pluginManager.runAfterMove(
          currentGameState,
          challengeState,
          lastDirectionRef.current,
          turnCountRef.current - 1,
          challengeConfigs,
        );

        updateChallengeState(afterResult.challenge);
        applyPluginActions(dispatch, afterResult.actions);

        appendRandomTile();
      }, mergeAnimationDuration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      const currentGameState = gameStateRef.current;
      const currentChallenge = challengeState;

      const isWon =
        Object.values(currentGameState.tiles).filter(
          (t) => t.value === gameWinTileValue,
        ).length > 0;

      if (isWon) {
        dispatch({ type: "update_status", status: "won" });
        return;
      }

      const challengeLost = pluginManager.checkGameOver(
        currentGameState,
        currentChallenge,
        turnCountRef.current,
        challengeConfigs,
      );

      if (challengeLost) {
        dispatch({ type: "update_status", status: "lost" });
        return;
      }

      const { tiles, board } = currentGameState;

      for (let x = 0; x < tileCountPerDimension - 1; x += 1) {
        for (let y = 0; y < tileCountPerDimension - 1; y += 1) {
          if (
            isNil(board[x][y]) ||
            isNil(board[x + 1][y]) ||
            isNil(board[x][y + 1])
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
    }
  }, [gameState.hasChanged, challengeState, challengeConfigs]);

  useEffect(() => {
    saveState(gameState as GameState, challengeState, challengeConfigs);
  }, [gameState, challengeState, challengeConfigs]);

  useEffect(() => {
    const hasCountdown =
      challengeConfigs.countdown &&
      challengeConfigs.countdown.enabled;

    if (!hasCountdown) return;

    const interval = setInterval(() => {
      updateChallengeState((prev) => {
        const tickResult = pluginManager.runTick(
          gameStateRef.current,
          prev,
          turnCountRef.current,
          challengeConfigs,
        );
        applyPluginActions(dispatch, tickResult.actions);
        return tickResult.challenge;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [challengeConfigs]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        getTiles,
        moveTiles,
        startGame,
        challengeState,
        challengeConfigs,
        setChallengeConfig,
        availablePlugins: allChallengePlugins,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}