import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cloneDeep, isNil, throttle } from "lodash";
import {
  ChallengeConfig,
  ChallengeModeId,
  EnabledChallengeModes,
  MoveDirection,
  createEmptyEnabledModes,
  defaultChallengeConfig,
  gameStorageKey,
  gameWinTileValue,
  mergeAnimationDuration,
  moveDirections,
  tileCountPerDimension,
} from "@/constants";
import { Tile, TileMap, isObstacleTile, normalizeTile } from "@/models/tile";
import gameReducer, {
  GameStatus,
  MovementRules,
  State as GameState,
  createBoard,
  createInitialState,
} from "@/reducers/game-reducer";

type ChallengeRuntimeState = {
  timeRemainingMs: number | null;
  disabledDirections: MoveDirection[];
  obstacleQueue: string[];
};

type GameSnapshot = {
  gameState: GameState;
  enabledModes: EnabledChallengeModes;
  challengeConfig: ChallengeConfig;
  challengeRuntime: ChallengeRuntimeState;
};

type GameSession = GameSnapshot & {
  history: GameSnapshot[];
};

type BeforeMoveResult = {
  snapshot: GameSnapshot;
  cancel?: boolean;
};

type ChallengePlugin = {
  id: ChallengeModeId;
  initialize?: (snapshot: GameSnapshot) => GameSnapshot;
  beforeMove?: (
    snapshot: GameSnapshot,
    direction: MoveDirection,
  ) => BeforeMoveResult;
  getMovementRules?: (snapshot: GameSnapshot) => Partial<MovementRules>;
  beforeSpawn?: (snapshot: GameSnapshot) => GameSnapshot;
  afterSpawn?: (snapshot: GameSnapshot) => GameSnapshot;
  onTick?: (snapshot: GameSnapshot, elapsedMs: number) => GameSnapshot;
  isGameOver?: (snapshot: GameSnapshot) => boolean;
};

type PersistedSession = {
  version: 2;
  snapshot: GameSnapshot;
  history: GameSnapshot[];
};

type GameContextValue = {
  score: number;
  status: GameStatus;
  moveTiles: (direction: MoveDirection) => void;
  getTiles: () => Tile[];
  getObstacles: () => Tile[];
  startGame: () => void;
  replayGame: () => void;
  undoMove: () => void;
  canUndo: boolean;
  enabledModes: EnabledChallengeModes;
  challengeConfig: ChallengeConfig;
  disabledDirections: MoveDirection[];
  timeRemainingMs: number | null;
  setChallengeModeEnabled: (modeId: ChallengeModeId, enabled: boolean) => void;
  updateChallengeModeConfig: (
    modeId: ChallengeModeId,
    field: string,
    value: number,
  ) => void;
};

const createDefaultRuntime = (): ChallengeRuntimeState => ({
  timeRemainingMs: null,
  disabledDirections: [],
  obstacleQueue: [],
});

const cloneSnapshot = (snapshot: GameSnapshot): GameSnapshot => cloneDeep(snapshot);

const createSnapshotFromSession = (session: GameSession): GameSnapshot =>
  cloneSnapshot({
    gameState: session.gameState,
    enabledModes: session.enabledModes,
    challengeConfig: session.challengeConfig,
    challengeRuntime: session.challengeRuntime,
  });

const createSessionFromSnapshot = (
  snapshot: GameSnapshot,
  history: GameSnapshot[] = [],
): GameSession => ({
  ...cloneSnapshot(snapshot),
  history: history.map((entry) => cloneSnapshot(entry)),
});

const clampNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
};

const randomizeDirections = (disabledCount: number) => {
  const pool = [...moveDirections];
  const results: MoveDirection[] = [];
  const safeDisabledCount = Math.min(
    Math.max(disabledCount, 0),
    moveDirections.length - 1,
  );

  for (let index = 0; index < safeDisabledCount; index += 1) {
    const itemIndex = Math.floor(Math.random() * pool.length);
    results.push(pool[itemIndex]);
    pool.splice(itemIndex, 1);
  }

  return results;
};

const getEmptyCells = (gameState: GameState) => {
  const results: [number, number][] = [];

  for (let x = 0; x < tileCountPerDimension; x += 1) {
    for (let y = 0; y < tileCountPerDimension; y += 1) {
      if (isNil(gameState.board[y][x])) {
        results.push([x, y]);
      }
    }
  }

  return results;
};

const createTile = (gameState: GameState, tile: Tile) => {
  const nextGameState = gameReducer(gameState, { type: "create_tile", tile });
  const createdTileId = nextGameState.tilesByIds[nextGameState.tilesByIds.length - 1];

  return {
    nextGameState,
    createdTileId,
  };
};

const appendRandomValueTile = (snapshot: GameSnapshot) => {
  const emptyCells = getEmptyCells(snapshot.gameState);

  if (emptyCells.length === 0) {
    return snapshot;
  }

  const cellIndex = Math.floor(Math.random() * emptyCells.length);
  const { nextGameState } = createTile(snapshot.gameState, {
    position: emptyCells[cellIndex],
    value: 2,
    kind: "value",
  });

  return {
    ...snapshot,
    gameState: nextGameState,
  };
};

const removeTiles = (gameState: GameState, tileIds: string[]) => {
  const removedTileIds = new Set(tileIds);
  const board = gameState.board.map((row) =>
    row.map((tileId) =>
      typeof tileId === "string" && removedTileIds.has(tileId) ? undefined : tileId,
    ),
  );
  const tiles = Object.entries(gameState.tiles).reduce<TileMap>(
    (result, [tileId, tile]) => {
      if (removedTileIds.has(tileId)) {
        return result;
      }

      return {
        ...result,
        [tileId]: tile,
      };
    },
    {},
  );

  return {
    ...gameState,
    board,
    tiles,
    tilesByIds: gameState.tilesByIds.filter((tileId) => !removedTileIds.has(tileId)),
    hasChanged: false,
  };
};

const patchTiles = (
  gameState: GameState,
  updater: (tile: Tile) => Tile,
): GameState => {
  const tiles = Object.entries(gameState.tiles).reduce<TileMap>((result, [tileId, tile]) => {
    return {
      ...result,
      [tileId]: updater(tile),
    };
  }, {});

  return {
    ...gameState,
    tiles,
    hasChanged: false,
  };
};

const hasWinningTile = (gameState: GameState) => {
  return (
    Object.values(gameState.tiles).filter(
      (tile) => !isObstacleTile(tile) && tile.value === gameWinTileValue,
    ).length > 0
  );
};

const getActivePlugins = (snapshot: GameSnapshot) => {
  return challengePlugins.filter((plugin) => snapshot.enabledModes[plugin.id]);
};

const buildMovementRules = (snapshot: GameSnapshot): MovementRules => {
  return getActivePlugins(snapshot).reduce<MovementRules>((result, plugin) => {
    const partialRules = plugin.getMovementRules?.(snapshot);

    if (typeof partialRules?.maxMergesPerMove === "number") {
      return {
        ...result,
        maxMergesPerMove:
          typeof result.maxMergesPerMove === "number"
            ? Math.min(result.maxMergesPerMove, partialRules.maxMergesPerMove)
            : partialRules.maxMergesPerMove,
      };
    }

    return result;
  }, {});
};

const hasAvailableMoves = (snapshot: GameSnapshot) => {
  const availableDirections = moveDirections.filter(
    (direction) => !snapshot.challengeRuntime.disabledDirections.includes(direction),
  );

  if (availableDirections.length === 0) {
    return false;
  }

  const movementRules = buildMovementRules(snapshot);

  return availableDirections.some((direction) => {
    const nextState = gameReducer(snapshot.gameState, {
      type: direction,
      rules: movementRules,
    });

    return nextState.hasChanged;
  });
};

const syncGameStatus = (snapshot: GameSnapshot) => {
  let nextStatus: GameStatus = "ongoing";

  if (hasWinningTile(snapshot.gameState)) {
    nextStatus = "won";
  } else if (
    getActivePlugins(snapshot).some((plugin) => plugin.isGameOver?.(snapshot)) ||
    !hasAvailableMoves(snapshot)
  ) {
    nextStatus = "lost";
  }

  return {
    ...snapshot,
    gameState: gameReducer(snapshot.gameState, {
      type: "update_status",
      status: nextStatus,
    }),
  };
};

const applyInitialization = (snapshot: GameSnapshot) => {
  const initializedSnapshot = getActivePlugins(snapshot).reduce(
    (currentSnapshot, plugin) => plugin.initialize?.(currentSnapshot) ?? currentSnapshot,
    snapshot,
  );

  return syncGameStatus(initializedSnapshot);
};

const applyBeforeMove = (snapshot: GameSnapshot, direction: MoveDirection) => {
  return getActivePlugins(snapshot).reduce<BeforeMoveResult>(
    (result, plugin) => {
      if (result.cancel) {
        return result;
      }

      return plugin.beforeMove?.(result.snapshot, direction) ?? result;
    },
    {
      snapshot,
      cancel: false,
    },
  );
};

const applyBeforeSpawn = (snapshot: GameSnapshot) => {
  return getActivePlugins(snapshot).reduce(
    (currentSnapshot, plugin) => plugin.beforeSpawn?.(currentSnapshot) ?? currentSnapshot,
    snapshot,
  );
};

const applyAfterSpawn = (snapshot: GameSnapshot) => {
  return getActivePlugins(snapshot).reduce(
    (currentSnapshot, plugin) => plugin.afterSpawn?.(currentSnapshot) ?? currentSnapshot,
    snapshot,
  );
};

const applyTick = (snapshot: GameSnapshot, elapsedMs: number) => {
  const updatedSnapshot = getActivePlugins(snapshot).reduce(
    (currentSnapshot, plugin) =>
      plugin.onTick?.(currentSnapshot, elapsedMs) ?? currentSnapshot,
    snapshot,
  );

  return syncGameStatus(updatedSnapshot);
};

const sanitizeEnabledModes = (raw: unknown): EnabledChallengeModes => {
  const nextModes = createEmptyEnabledModes();

  if (typeof raw !== "object" || isNil(raw)) {
    return nextModes;
  }

  const source = raw as Partial<EnabledChallengeModes>;

  Object.keys(nextModes).forEach((key) => {
    const modeId = key as ChallengeModeId;
    nextModes[modeId] = Boolean(source[modeId]);
  });

  return nextModes;
};

const sanitizeChallengeConfig = (raw: unknown): ChallengeConfig => {
  const source = typeof raw === "object" && !isNil(raw) ? raw : {};
  const castSource = source as Partial<ChallengeConfig>;

  return {
    obstacle: {
      spawnCount: clampNumber(
        castSource.obstacle?.spawnCount,
        defaultChallengeConfig.obstacle.spawnCount,
        1,
        2,
      ),
      maxObstacles: clampNumber(
        castSource.obstacle?.maxObstacles,
        defaultChallengeConfig.obstacle.maxObstacles,
        1,
        6,
      ),
    },
    decay: {
      step: clampNumber(castSource.decay?.step, defaultChallengeConfig.decay.step, 1, 3),
      minimumValue: clampNumber(
        castSource.decay?.minimumValue,
        defaultChallengeConfig.decay.minimumValue,
        2,
        32,
      ),
    },
    mergeLimit: {
      maxMergesPerMove: clampNumber(
        castSource.mergeLimit?.maxMergesPerMove,
        defaultChallengeConfig.mergeLimit.maxMergesPerMove,
        0,
        4,
      ),
    },
    countdown: {
      durationMs: clampNumber(
        castSource.countdown?.durationMs,
        defaultChallengeConfig.countdown.durationMs,
        5000,
        120000,
      ),
      bonusMsPerMove: clampNumber(
        castSource.countdown?.bonusMsPerMove,
        defaultChallengeConfig.countdown.bonusMsPerMove,
        0,
        10000,
      ),
    },
    disabledDirection: {
      disabledCount: clampNumber(
        castSource.disabledDirection?.disabledCount,
        defaultChallengeConfig.disabledDirection.disabledCount,
        1,
        3,
      ),
    },
  };
};

const sanitizeTile = (rawTile: unknown, position: [number, number]) => {
  if (typeof rawTile !== "object" || isNil(rawTile)) {
    return null;
  }

  const tile = rawTile as Tile;

  if (typeof tile.value !== "number" || Number.isNaN(tile.value)) {
    return null;
  }

  return normalizeTile({
    ...tile,
    position,
    value: Math.max(0, Math.floor(tile.value)),
  });
};

const sanitizeGameState = (raw: unknown): GameState => {
  if (typeof raw !== "object" || isNil(raw)) {
    return createInitialState();
  }

  const source = raw as Partial<GameState>;
  const tilesSource =
    typeof source.tiles === "object" && !isNil(source.tiles) ? source.tiles : {};
  const board = createBoard();
  const tiles: TileMap = {};

  for (let y = 0; y < tileCountPerDimension; y += 1) {
    for (let x = 0; x < tileCountPerDimension; x += 1) {
      const rawTileId = source.board?.[y]?.[x];

      if (typeof rawTileId !== "string") {
        continue;
      }

      const tile = sanitizeTile((tilesSource as TileMap)[rawTileId], [x, y]);

      if (isNil(tile)) {
        continue;
      }

      board[y][x] = rawTileId;
      tiles[rawTileId] = tile;
    }
  }

  const status: GameStatus =
    source.status === "won" || source.status === "lost" ? source.status : "ongoing";

  return {
    board,
    tiles,
    tilesByIds: Object.keys(tiles),
    hasChanged: false,
    score:
      typeof source.score === "number" && !Number.isNaN(source.score)
        ? Math.max(0, Math.floor(source.score))
        : 0,
    status,
  };
};

const sanitizeRuntime = (raw: unknown, gameState: GameState): ChallengeRuntimeState => {
  const runtime = createDefaultRuntime();

  if (typeof raw !== "object" || isNil(raw)) {
    return runtime;
  }

  const source = raw as Partial<ChallengeRuntimeState>;

  runtime.timeRemainingMs =
    typeof source.timeRemainingMs === "number" && !Number.isNaN(source.timeRemainingMs)
      ? Math.max(0, Math.floor(source.timeRemainingMs))
      : null;
  runtime.disabledDirections = Array.isArray(source.disabledDirections)
    ? source.disabledDirections.filter((direction): direction is MoveDirection =>
        moveDirections.includes(direction as MoveDirection),
      )
    : [];
  runtime.obstacleQueue = Array.isArray(source.obstacleQueue)
    ? source.obstacleQueue.filter((tileId) => {
        if (typeof tileId !== "string") {
          return false;
        }

        return isObstacleTile(gameState.tiles[tileId]);
      })
    : [];

  return runtime;
};

const buildStartedGameState = () => {
  let gameState = createInitialState();
  gameState = gameReducer(gameState, {
    type: "create_tile",
    tile: { position: [0, 1], value: 2, kind: "value" },
  });
  gameState = gameReducer(gameState, {
    type: "create_tile",
    tile: { position: [0, 2], value: 2, kind: "value" },
  });

  return gameState;
};

const buildFreshSnapshot = (
  enabledModes = createEmptyEnabledModes(),
  challengeConfig = cloneDeep(defaultChallengeConfig),
) => {
  return applyInitialization({
    gameState: buildStartedGameState(),
    enabledModes,
    challengeConfig,
    challengeRuntime: createDefaultRuntime(),
  });
};

const buildFreshSession = (
  enabledModes = createEmptyEnabledModes(),
  challengeConfig = cloneDeep(defaultChallengeConfig),
) => createSessionFromSnapshot(buildFreshSnapshot(enabledModes, challengeConfig));

const sanitizeSnapshot = (raw: unknown) => {
  const enabledModes = sanitizeEnabledModes((raw as Partial<GameSnapshot>)?.enabledModes);
  const challengeConfig = sanitizeChallengeConfig(
    (raw as Partial<GameSnapshot>)?.challengeConfig,
  );
  const gameState = sanitizeGameState((raw as Partial<GameSnapshot>)?.gameState ?? raw);
  const challengeRuntime = sanitizeRuntime(
    (raw as Partial<GameSnapshot>)?.challengeRuntime,
    gameState,
  );

  return syncGameStatus({
    gameState,
    enabledModes,
    challengeConfig,
    challengeRuntime,
  });
};

const sanitizeSession = (raw: unknown): GameSession => {
  if (typeof raw !== "object" || isNil(raw)) {
    return buildFreshSession();
  }

  const source = raw as Partial<PersistedSession>;

  if (source.version === 2 && !isNil(source.snapshot)) {
    const snapshot = sanitizeSnapshot(source.snapshot);
    const history = Array.isArray(source.history)
      ? source.history.map((entry) => sanitizeSnapshot(entry))
      : [];

    return createSessionFromSnapshot(snapshot, history);
  }

  return createSessionFromSnapshot(sanitizeSnapshot(source));
};

const loadStoredSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(gameStorageKey);

    if (isNil(rawValue)) {
      return null;
    }

    return sanitizeSession(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

const pushHistory = (history: GameSnapshot[], snapshot: GameSnapshot) => {
  return [...history.slice(-19), cloneSnapshot(snapshot)];
};

const formatPersistedSession = (session: GameSession): PersistedSession => ({
  version: 2,
  snapshot: createSnapshotFromSession(session),
  history: session.history.map((entry) => cloneSnapshot(entry)),
});

const obstaclePlugin: ChallengePlugin = {
  id: "obstacle",
  afterSpawn: (snapshot) => {
    const queue = [...snapshot.challengeRuntime.obstacleQueue];
    const maxObstacles = snapshot.challengeConfig.obstacle.maxObstacles;
    let gameState = snapshot.gameState;

    for (
      let count = 0;
      count < snapshot.challengeConfig.obstacle.spawnCount;
      count += 1
    ) {
      if (queue.length >= maxObstacles) {
        const tileIdToRemove = queue.shift();

        if (typeof tileIdToRemove === "string") {
          gameState = removeTiles(gameState, [tileIdToRemove]);
        }
      }

      const emptyCells = getEmptyCells(gameState);

      if (emptyCells.length === 0) {
        break;
      }

      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const { nextGameState, createdTileId } = createTile(gameState, {
        position: emptyCells[randomIndex],
        value: 0,
        kind: "obstacle",
      });

      gameState = nextGameState;
      queue.push(createdTileId);
    }

    return {
      ...snapshot,
      gameState,
      challengeRuntime: {
        ...snapshot.challengeRuntime,
        obstacleQueue: queue,
      },
    };
  },
};

const decayPlugin: ChallengePlugin = {
  id: "decay",
  beforeSpawn: (snapshot) => {
    const decayFactor = 2 ** snapshot.challengeConfig.decay.step;
    const minimumValue = snapshot.challengeConfig.decay.minimumValue;

    return {
      ...snapshot,
      gameState: patchTiles(snapshot.gameState, (tile) => {
        if (isObstacleTile(tile)) {
          return tile;
        }

        return {
          ...tile,
          value: Math.max(minimumValue, Math.floor(tile.value / decayFactor)),
        };
      }),
    };
  },
};

const mergeLimitPlugin: ChallengePlugin = {
  id: "mergeLimit",
  getMovementRules: (snapshot) => ({
    maxMergesPerMove: snapshot.challengeConfig.mergeLimit.maxMergesPerMove,
  }),
};

const countdownPlugin: ChallengePlugin = {
  id: "countdown",
  initialize: (snapshot) => ({
    ...snapshot,
    challengeRuntime: {
      ...snapshot.challengeRuntime,
      timeRemainingMs: snapshot.challengeConfig.countdown.durationMs,
    },
  }),
  afterSpawn: (snapshot) => ({
    ...snapshot,
    challengeRuntime: {
      ...snapshot.challengeRuntime,
      timeRemainingMs: Math.max(
        0,
        (snapshot.challengeRuntime.timeRemainingMs ?? 0) +
          snapshot.challengeConfig.countdown.bonusMsPerMove,
      ),
    },
  }),
  onTick: (snapshot, elapsedMs) => ({
    ...snapshot,
    challengeRuntime: {
      ...snapshot.challengeRuntime,
      timeRemainingMs: Math.max(
        0,
        (snapshot.challengeRuntime.timeRemainingMs ?? 0) - elapsedMs,
      ),
    },
  }),
  isGameOver: (snapshot) => (snapshot.challengeRuntime.timeRemainingMs ?? 1) <= 0,
};

const disabledDirectionPlugin: ChallengePlugin = {
  id: "disabledDirection",
  initialize: (snapshot) => ({
    ...snapshot,
    challengeRuntime: {
      ...snapshot.challengeRuntime,
      disabledDirections: randomizeDirections(
        snapshot.challengeConfig.disabledDirection.disabledCount,
      ),
    },
  }),
  beforeMove: (snapshot, direction) => ({
    snapshot,
    cancel: snapshot.challengeRuntime.disabledDirections.includes(direction),
  }),
  afterSpawn: (snapshot) => ({
    ...snapshot,
    challengeRuntime: {
      ...snapshot.challengeRuntime,
      disabledDirections: randomizeDirections(
        snapshot.challengeConfig.disabledDirection.disabledCount,
      ),
    },
  }),
};

const challengePlugins: ChallengePlugin[] = [
  obstaclePlugin,
  decayPlugin,
  mergeLimitPlugin,
  countdownPlugin,
  disabledDirectionPlugin,
];

const defaultContextValue: GameContextValue = {
  score: 0,
  status: "ongoing",
  moveTiles: () => {},
  getTiles: () => [],
  getObstacles: () => [],
  startGame: () => {},
  replayGame: () => {},
  undoMove: () => {},
  canUndo: false,
  enabledModes: createEmptyEnabledModes(),
  challengeConfig: cloneDeep(defaultChallengeConfig),
  disabledDirections: [],
  timeRemainingMs: null,
  setChallengeModeEnabled: () => {},
  updateChallengeModeConfig: () => {},
};

export const GameContext = createContext<GameContextValue>(defaultContextValue);

export default function GameProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<GameSession>(() => buildFreshSession());
  const [storageReady, setStorageReady] = useState(false);
  const lastTickTime = useRef(Date.now());

  useEffect(() => {
    const storedSession = loadStoredSession();

    if (!isNil(storedSession)) {
      setSession(storedSession);
    }

    setStorageReady(true);
    lastTickTime.current = Date.now();
  }, []);

  useEffect(() => {
    if (!storageReady || session.gameState.hasChanged) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      gameStorageKey,
      JSON.stringify(formatPersistedSession(session)),
    );
  }, [session, storageReady]);

  useEffect(() => {
    if (!session.gameState.hasChanged) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSession((currentSession) => {
        if (!currentSession.gameState.hasChanged) {
          return currentSession;
        }

        let nextSnapshot: GameSnapshot = {
          ...createSnapshotFromSession(currentSession),
          gameState: gameReducer(currentSession.gameState, { type: "clean_up" }),
        };

        nextSnapshot = applyBeforeSpawn(nextSnapshot);
        nextSnapshot = appendRandomValueTile(nextSnapshot);
        nextSnapshot = applyAfterSpawn(nextSnapshot);
        nextSnapshot = syncGameStatus(nextSnapshot);

        return {
          ...currentSession,
          ...nextSnapshot,
        };
      });
    }, mergeAnimationDuration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [session.gameState.hasChanged]);

  useEffect(() => {
    if (!session.enabledModes.countdown || session.gameState.status !== "ongoing") {
      return;
    }

    lastTickTime.current = Date.now();

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTickTime.current;
      lastTickTime.current = now;

      setSession((currentSession) => {
        const currentSnapshot = createSnapshotFromSession(currentSession);

        if (
          !currentSnapshot.enabledModes.countdown ||
          currentSnapshot.gameState.status !== "ongoing" ||
          currentSnapshot.gameState.hasChanged
        ) {
          return currentSession;
        }

        const nextSnapshot = applyTick(currentSnapshot, elapsedMs);

        return {
          ...currentSession,
          ...nextSnapshot,
        };
      });
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session.enabledModes.countdown, session.gameState.status]);

  const restartWithCurrentChallenge = useCallback(() => {
    setSession((currentSession) =>
      buildFreshSession(currentSession.enabledModes, currentSession.challengeConfig),
    );
    lastTickTime.current = Date.now();
  }, []);

  const undoMove = useCallback(() => {
    setSession((currentSession) => {
      if (currentSession.history.length === 0) {
        return currentSession;
      }

      const previousSnapshot = currentSession.history[currentSession.history.length - 1];

      return createSessionFromSnapshot(
        previousSnapshot,
        currentSession.history.slice(0, -1),
      );
    });
    lastTickTime.current = Date.now();
  }, []);

  const setChallengeModeEnabled = useCallback(
    (modeId: ChallengeModeId, enabled: boolean) => {
      setSession((currentSession) => {
        const nextModes = {
          ...currentSession.enabledModes,
          [modeId]: enabled,
        };

        return buildFreshSession(nextModes, currentSession.challengeConfig);
      });
      lastTickTime.current = Date.now();
    },
    [],
  );

  const updateChallengeModeConfig = useCallback(
    (modeId: ChallengeModeId, field: string, value: number) => {
      setSession((currentSession) => {
        const nextConfig = sanitizeChallengeConfig({
          ...currentSession.challengeConfig,
          [modeId]: {
            ...currentSession.challengeConfig[modeId],
            [field]: value,
          },
        });

        return buildFreshSession(currentSession.enabledModes, nextConfig);
      });
      lastTickTime.current = Date.now();
    },
    [],
  );

  const throttledMoveTiles = useMemo(
    () =>
      throttle(
        (direction: MoveDirection) => {
          setSession((currentSession) => {
            if (
              currentSession.gameState.status !== "ongoing" ||
              currentSession.gameState.hasChanged
            ) {
              return currentSession;
            }

            const currentSnapshot = createSnapshotFromSession(currentSession);
            const beforeMoveResult = applyBeforeMove(currentSnapshot, direction);

            if (beforeMoveResult.cancel) {
              const nextSnapshot = syncGameStatus(beforeMoveResult.snapshot);
              return {
                ...currentSession,
                ...nextSnapshot,
              };
            }

            const movementRules = buildMovementRules(beforeMoveResult.snapshot);
            const nextGameState = gameReducer(beforeMoveResult.snapshot.gameState, {
              type: direction,
              rules: movementRules,
            });

            if (!nextGameState.hasChanged) {
              const nextSnapshot = syncGameStatus({
                ...beforeMoveResult.snapshot,
                gameState: nextGameState,
              });

              return {
                ...currentSession,
                ...nextSnapshot,
              };
            }

            return {
              ...currentSession,
              ...beforeMoveResult.snapshot,
              gameState: nextGameState,
              history: pushHistory(currentSession.history, currentSnapshot),
            };
          });
        },
        mergeAnimationDuration * 1.05,
        { trailing: false },
      ),
    [],
  );

  useEffect(() => {
    return () => {
      throttledMoveTiles.cancel();
    };
  }, [throttledMoveTiles]);

  const getTiles = useCallback(() => {
    return session.gameState.tilesByIds
      .map((tileId) => session.gameState.tiles[tileId])
      .filter((tile): tile is Tile => !isNil(tile))
      .map((tile) => normalizeTile(tile))
      .filter((tile) => !isObstacleTile(tile));
  }, [session.gameState.tiles, session.gameState.tilesByIds]);

  const getObstacles = useCallback(() => {
    return session.gameState.tilesByIds
      .map((tileId) => session.gameState.tiles[tileId])
      .filter((tile): tile is Tile => !isNil(tile))
      .map((tile) => normalizeTile(tile))
      .filter((tile) => isObstacleTile(tile));
  }, [session.gameState.tiles, session.gameState.tilesByIds]);

  const moveTiles = useCallback(
    (direction: MoveDirection) => {
      throttledMoveTiles(direction);
    },
    [throttledMoveTiles],
  );

  return (
    <GameContext.Provider
      value={{
        score: session.gameState.score,
        status: session.gameState.status,
        moveTiles,
        getTiles,
        getObstacles,
        startGame: restartWithCurrentChallenge,
        replayGame: restartWithCurrentChallenge,
        undoMove,
        canUndo: session.history.length > 0 && !session.gameState.hasChanged,
        enabledModes: session.enabledModes,
        challengeConfig: session.challengeConfig,
        disabledDirections: session.challengeRuntime.disabledDirections,
        timeRemainingMs: session.challengeRuntime.timeRemainingMs,
        setChallengeModeEnabled,
        updateChallengeModeConfig,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
