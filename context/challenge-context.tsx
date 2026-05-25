import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { challengeTickInterval, maxUndoSteps } from "@/constants";
import {
  ChallengeState,
  ChallengeConfig,
  ChallengeEffect,
  GameState,
  MoveDirection,
  initialChallengeState,
} from "@/models/challenge";
import { getChallenge } from "@/challenges/registry";

type HistoryEntry = {
  gameState: GameState;
  challengeState: ChallengeState;
};

type ChallengeContextValue = {
  challengeState: ChallengeState;
  toggleChallenge: (id: string) => void;
  updateChallengeConfig: (id: string, config: ChallengeConfig) => void;
  startChallengeMode: () => void;
  stopChallengeMode: () => void;
  processBeforeAction: (
    action: { type: string; [key: string]: unknown },
    gameState: GameState,
  ) => { type: string; [key: string]: unknown } | null;
  processAfterMove: (gameState: GameState) => ChallengeEffect[];
  processCheckGameOver: (gameState: GameState) => boolean;
  getDisabledDirections: () => MoveDirection[];
  tickTimer: () => void;
  undo: () => HistoryEntry | null;
  saveHistory: (gameState: GameState) => void;
  updatePluginState: (pluginId: string, partial: Record<string, unknown>) => void;
  isChallengeMode: boolean;
};

export const ChallengeContext = createContext<ChallengeContextValue>({
  challengeState: initialChallengeState,
  toggleChallenge: () => {},
  updateChallengeConfig: () => {},
  startChallengeMode: () => {},
  stopChallengeMode: () => {},
  processBeforeAction: (action) => action,
  processAfterMove: () => [],
  processCheckGameOver: () => false,
  getDisabledDirections: () => [],
  tickTimer: () => {},
  undo: () => null,
  saveHistory: () => {},
  updatePluginState: () => {},
  isChallengeMode: false,
});

export default function ChallengeProvider({ children }: PropsWithChildren) {
  const [challengeState, setChallengeState] = useState<ChallengeState>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("2048-challenge-state");
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initialChallengeState, ...parsed };
        }
      }
    } catch {
      // ignore corrupted localStorage data - fall back to initial state
    }
    return initialChallengeState;
  });

  const historyRef = useRef<HistoryEntry[]>([]);
  const stateRef = useRef(challengeState);
  stateRef.current = challengeState;

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("2048-challenge-state", JSON.stringify(challengeState));
      }
    } catch {
      // ignore storage errors
    }
  }, [challengeState]);

  const toggleChallenge = useCallback((id: string) => {
    setChallengeState((prev: ChallengeState) => {
      const plugin = getChallenge(id);
      if (!plugin) return prev;

      const isActive = prev.activeChallenges.includes(id);
      const newActive = isActive
        ? prev.activeChallenges.filter((c: string) => c !== id)
        : [...prev.activeChallenges, id];

      const newConfigs = { ...prev.configs };
      if (!isActive && !newConfigs[id]) {
        newConfigs[id] = { ...plugin.defaultConfig };
      }

      const newPluginStates = { ...prev.pluginStates };
      if (!isActive) {
        newPluginStates[id] = plugin.initPluginState
          ? plugin.initPluginState(newConfigs[id])
          : {};
      } else {
        delete newPluginStates[id];
      }

      const allDisabled: MoveDirection[] = [];
      for (const challengeId of newActive) {
        const p = getChallenge(challengeId);
        if (p?.getDisabledDirections) {
          allDisabled.push(...p.getDisabledDirections(newPluginStates[challengeId] || {}, newConfigs[challengeId] || {}));
        }
      }

      return {
        ...prev,
        activeChallenges: newActive,
        configs: newConfigs,
        pluginStates: newPluginStates,
        disabledDirections: allDisabled,
      };
    });
  }, []);

  const updateChallengeConfig = useCallback((id: string, config: ChallengeConfig) => {
    setChallengeState((prev: ChallengeState) => ({
      ...prev,
      configs: {
        ...prev.configs,
        [id]: { ...prev.configs[id], ...config },
      },
    }));
  }, []);

  const updatePluginState = useCallback((pluginId: string, partial: Record<string, unknown>) => {
    setChallengeState((prev: ChallengeState) => ({
      ...prev,
      pluginStates: {
        ...prev.pluginStates,
        [pluginId]: {
          ...(prev.pluginStates[pluginId] || {}),
          ...partial,
        },
      },
    }));
  }, []);

  const startChallengeMode = useCallback(() => {
    setChallengeState((prev: ChallengeState) => {
      const newPluginStates: Record<string, Record<string, unknown>> = {};
      const newConfigs: Record<string, ChallengeConfig> = {};

      for (const id of prev.activeChallenges) {
        const plugin = getChallenge(id);
        if (plugin) {
          newConfigs[id] = prev.configs[id] || { ...plugin.defaultConfig };
          newPluginStates[id] = plugin.initPluginState
            ? plugin.initPluginState(newConfigs[id])
            : {};
        }
      }

      return {
        ...prev,
        isChallengeMode: true,
        pluginStates: newPluginStates,
        configs: newConfigs,
      };
    });
  }, []);

  const stopChallengeMode = useCallback(() => {
    setChallengeState(initialChallengeState);
    historyRef.current = [];
  }, []);

  const processBeforeAction = useCallback(
    (action: { type: string; [key: string]: unknown }, gameState: GameState) => {
      const state = stateRef.current;
      let currentAction: { type: string; [key: string]: unknown } | null = action;

      for (const challengeId of state.activeChallenges) {
        if (!currentAction) break;
        const plugin = getChallenge(challengeId);
        if (plugin?.beforeAction) {
          currentAction = plugin.beforeAction(
            currentAction,
            gameState,
            state.pluginStates[challengeId] || {},
            state.configs[challengeId] || {},
          );
        }
      }

      return currentAction;
    },
    [],
  );

  const processAfterMove = useCallback((gameState: GameState): ChallengeEffect[] => {
    const state = stateRef.current;
    const allEffects: ChallengeEffect[] = [];

    for (const challengeId of state.activeChallenges) {
      const plugin = getChallenge(challengeId);
      if (plugin?.afterMove) {
        const effects = plugin.afterMove(
          gameState,
          state.pluginStates[challengeId] || {},
          state.configs[challengeId] || {},
        );
        allEffects.push(...effects);
      }
    }

    return allEffects;
  }, []);

  const processCheckGameOver = useCallback((gameState: GameState): boolean => {
    const state = stateRef.current;
    for (const challengeId of state.activeChallenges) {
      const plugin = getChallenge(challengeId);
      if (plugin?.checkGameOver) {
        const result = plugin.checkGameOver(
          gameState,
          state.pluginStates[challengeId] || {},
          state.configs[challengeId] || {},
        );
        if (result === true) return true;
      }
    }
    return false;
  }, []);

  const getDisabledDirections = useCallback((): MoveDirection[] => {
    const state = stateRef.current;
    const allDisabled: MoveDirection[] = [];
    for (const challengeId of state.activeChallenges) {
      const plugin = getChallenge(challengeId);
      if (plugin?.getDisabledDirections) {
        allDisabled.push(
          ...plugin.getDisabledDirections(
            state.pluginStates[challengeId] || {},
            state.configs[challengeId] || {},
          ),
        );
      }
    }
    return allDisabled;
  }, []);

  const tickTimer = useCallback(() => {
    setChallengeState((prev: ChallengeState) => {
      if (!prev.activeChallenges.includes("countdown")) return prev;

      const countdownState = prev.pluginStates["countdown"] || {};
      const timeRemaining = (countdownState.timeRemaining as number) ?? 0;

      if (timeRemaining <= 0) return prev;

      return {
        ...prev,
        pluginStates: {
          ...prev.pluginStates,
          countdown: {
            ...countdownState,
            timeRemaining: timeRemaining - 1,
          },
        },
      };
    });
  }, []);

  const saveHistory = useCallback((gameState: GameState) => {
    const entry: HistoryEntry = {
      gameState,
      challengeState: stateRef.current,
    };
    historyRef.current = [
      ...historyRef.current.slice(-(maxUndoSteps - 1)),
      entry,
    ];
  }, []);

  const undo = useCallback((): HistoryEntry | null => {
    if (historyRef.current.length === 0) return null;
    const entry = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setChallengeState(entry.challengeState);
    return entry;
  }, []);

  useEffect(() => {
    if (!challengeState.isChallengeMode) return;
    if (!challengeState.activeChallenges.includes("countdown")) return;

    const timer = setInterval(tickTimer, challengeTickInterval);
    return () => clearInterval(timer);
  }, [challengeState.isChallengeMode, challengeState.activeChallenges, tickTimer]);

  return (
    <ChallengeContext.Provider
      value={{
        challengeState,
        toggleChallenge,
        updateChallengeConfig,
        startChallengeMode,
        stopChallengeMode,
        processBeforeAction,
        processAfterMove,
        processCheckGameOver,
        getDisabledDirections,
        tickTimer,
        undo,
        saveHistory,
        updatePluginState,
        isChallengeMode: challengeState.isChallengeMode,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}
