import {
  ChallengeConfig,
  ChallengePluginContext,
  ChallengePluginResult,
  ChallengeState,
  Direction,
  GameState,
  PluginAction,
  defaultChallengeState,
} from "@/models/challenge";
import { ChallengePlugin } from "./types";

export function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

function setToSerializable(s: Set<string>): string[] {
  return Array.from(s);
}

function serializableToSet(arr: unknown): Set<string> {
  if (Array.isArray(arr)) {
    return new Set(arr.filter((v): v is string => typeof v === "string"));
  }
  return new Set();
}

export function serializeChallengeState(
  cs: ChallengeState,
): Record<string, unknown> {
  return {
    obstacles: cs.obstacles,
    obstaclePositions: setToSerializable(cs.obstaclePositions),
    mergeCount: cs.mergeCount,
    countdownSeconds: cs.countdownSeconds,
    countdownStarted: cs.countdownStarted,
    decayCounter: cs.decayCounter,
    disabledDirection: cs.disabledDirection,
    disabledDirectionTimer: cs.disabledDirectionTimer,
  };
}

export function deserializeChallengeState(
  data: Record<string, unknown>,
): ChallengeState {
  return {
    obstacles: (data.obstacles as ChallengeState["obstacles"]) || {},
    obstaclePositions: serializableToSet(data.obstaclePositions),
    mergeCount: (data.mergeCount as number) ?? 0,
    countdownSeconds: (data.countdownSeconds as number) ?? 0,
    countdownStarted: (data.countdownStarted as boolean) ?? false,
    decayCounter: (data.decayCounter as number) ?? 0,
    disabledDirection: (data.disabledDirection as Direction | null) ?? null,
    disabledDirectionTimer: (data.disabledDirectionTimer as number) ?? 0,
  };
}

function emptyResult(): ChallengePluginResult {
  return {
    state: null as unknown as GameState,
    challenge: null as unknown as ChallengeState,
    blocked: false,
    actions: [],
  };
}

export function createPluginManager(plugins: ChallengePlugin[]) {
  const pluginMap = new Map<string, ChallengePlugin>();
  for (let i = 0; i < plugins.length; i++) {
    pluginMap.set(plugins[i].id, plugins[i]);
  }

  function collectActions(results: ChallengePluginResult[]): PluginAction[] {
    const allActions: PluginAction[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].actions && results[i].actions.length > 0) {
        for (let j = 0; j < results[i].actions.length; j++) {
          allActions.push(results[i].actions[j]);
        }
      }
    }
    return allActions;
  }

  function runBeforeMove(
    state: GameState,
    challenge: ChallengeState,
    direction: Direction,
    turnCount: number,
    configs: Record<string, ChallengeConfig>,
  ): ChallengePluginResult {
    let currentChallenge = challenge;
    let blocked = false;
    let blockReason: string | undefined;
    const allResults: ChallengePluginResult[] = [];

    const ctx: ChallengePluginContext = {
      state,
      challenge: currentChallenge,
      movedDirection: direction,
      turnCount,
    };

    const entries = Array.from(pluginMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, plugin] = entries[i];
      const config = configs[id];
      if (!config || !config.enabled) continue;

      const result = plugin.onBeforeMove(ctx, config);
      allResults.push(result);
      currentChallenge = result.challenge;
      ctx.challenge = currentChallenge;

      if (result.blocked) {
        blocked = true;
        blockReason = result.blockReason;
        break;
      }
    }

    return {
      state,
      challenge: currentChallenge,
      blocked,
      blockReason,
      actions: collectActions(allResults),
    };
  }

  function runAfterMove(
    state: GameState,
    challenge: ChallengeState,
    direction: Direction,
    turnCount: number,
    configs: Record<string, ChallengeConfig>,
  ): ChallengePluginResult {
    let currentChallenge = challenge;
    const allResults: ChallengePluginResult[] = [];

    const ctx: ChallengePluginContext = {
      state,
      challenge: currentChallenge,
      movedDirection: direction,
      turnCount,
    };

    const entries = Array.from(pluginMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, plugin] = entries[i];
      const config = configs[id];
      if (!config || !config.enabled) continue;

      const result = plugin.onAfterMove(ctx, config);
      allResults.push(result);
      currentChallenge = result.challenge;
      ctx.challenge = currentChallenge;
    }

    return {
      state,
      challenge: currentChallenge,
      blocked: false,
      actions: collectActions(allResults),
    };
  }

  function runTick(
    state: GameState,
    challenge: ChallengeState,
    turnCount: number,
    configs: Record<string, ChallengeConfig>,
  ): ChallengePluginResult {
    let currentChallenge = challenge;
    const allResults: ChallengePluginResult[] = [];

    const ctx: ChallengePluginContext = {
      state,
      challenge: currentChallenge,
      movedDirection: null,
      turnCount,
    };

    const entries = Array.from(pluginMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, plugin] = entries[i];
      const config = configs[id];
      if (!config || !config.enabled) continue;
      if (!plugin.onTick) continue;

      const result = plugin.onTick(ctx, config);
      allResults.push(result);
      currentChallenge = result.challenge;
      ctx.challenge = currentChallenge;
    }

    return {
      state,
      challenge: currentChallenge,
      blocked: false,
      actions: collectActions(allResults),
    };
  }

  function checkGameOver(
    state: GameState,
    challenge: ChallengeState,
    turnCount: number,
    configs: Record<string, ChallengeConfig>,
  ): boolean {
    const entries = Array.from(pluginMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, plugin] = entries[i];
      const config = configs[id];
      if (!config || !config.enabled) continue;

      const ctx: ChallengePluginContext = {
        state,
        challenge,
        movedDirection: null,
        turnCount,
      };

      if (plugin.checkGameOver(ctx, config)) {
        return true;
      }
    }
    return false;
  }

  function getDisabledDirections(
    state: GameState,
    challenge: ChallengeState,
    turnCount: number,
    configs: Record<string, ChallengeConfig>,
  ): Direction[] {
    const disabled: Direction[] = [];
    const entries = Array.from(pluginMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, plugin] = entries[i];
      const config = configs[id];
      if (!config || !config.enabled) continue;
      if (!plugin.getDisabledDirections) continue;

      const ctx: ChallengePluginContext = {
        state,
        challenge,
        movedDirection: null,
        turnCount,
      };

      const dirs = plugin.getDisabledDirections(ctx, config);
      for (let j = 0; j < dirs.length; j++) {
        disabled.push(dirs[j]);
      }
    }
    return disabled;
  }

  return {
    getPlugin: (id: string) => pluginMap.get(id),
    getAllIds: () => {
      const ids: string[] = [];
      pluginMap.forEach((_, key) => ids.push(key));
      return ids;
    },
    runBeforeMove,
    runAfterMove,
    runTick,
    checkGameOver,
    getDisabledDirections,
    pluginMap,
  };
}

export type PluginManager = ReturnType<typeof createPluginManager>;