import {
  ChallengeConfig,
  ChallengePluginContext,
  ChallengePluginResult,
  ChallengeState,
  GameState,
} from "@/models/challenge";
import { ChallengePlugin, ConfigField } from "../types";

let preMoveState: GameState | null = null;

const configSchema = (): ConfigField[] => [
  {
    key: "maxMerges",
    label: "Max merges per turn",
    type: "number",
    defaultValue: 2,
    min: 1,
    max: 8,
    step: 1,
  },
];

export const mergeLimitPlugin: ChallengePlugin = {
  id: "merge-limit",
  name: "Merge Limit",
  emoji: "🔗",
  description: "Only a limited number of merges are allowed per turn.",
  configFields: configSchema(),
  defaultConfig: {
    enabled: false,
    maxMerges: 2,
  },
  getConfigSchema: configSchema,
  createDefaultState(): Partial<ChallengeState> {
    return { mergeCount: 0 };
  },
  serializeState(state: Partial<ChallengeState>): Record<string, unknown> {
    return { mergeCount: state.mergeCount ?? 0 };
  },
  deserializeState(data: Record<string, unknown>): Partial<ChallengeState> {
    return { mergeCount: (data.mergeCount as number) ?? 0 };
  },
  onBeforeMove(ctx: ChallengePluginContext): ChallengePluginResult {
    preMoveState = ctx.state;
    return {
      state: ctx.state,
      challenge: ctx.challenge,
      blocked: false,
      actions: [],
    };
  },
  onAfterMove(
    ctx: ChallengePluginContext,
    config: ChallengeConfig,
  ): ChallengePluginResult {
    const { state, challenge } = ctx;
    const maxMerges = (config.maxMerges as number) || 2;

    if (!preMoveState) {
      return { state, challenge, blocked: false, actions: [] };
    }

    const mergedTileIds: string[] = [];
    const prevTiles = preMoveState.tiles;
    const currTiles = state.tiles;

    for (const tileId of state.tilesByIds) {
      const currTile = currTiles[tileId];
      const prevTile = prevTiles[tileId];
      if (!currTile || !prevTile) continue;
      if (
        currTile.value > prevTile.value &&
        currTile.value === prevTile.value * 2
      ) {
        mergedTileIds.push(tileId);
      }
    }

    if (mergedTileIds.length <= maxMerges) {
      preMoveState = null;
      return {
        state,
        challenge: { ...challenge, mergeCount: mergedTileIds.length },
        blocked: false,
        actions: [],
      };
    }

    const revertedIdArr = mergedTileIds.slice(maxMerges);
    const updatedTiles: Record<
      string,
      { id?: string; position: [number, number]; value: number }
    > = {};

    for (let i = 0; i < revertedIdArr.length; i++) {
      const tileId = revertedIdArr[i];
      const currTile = state.tiles[tileId];
      if (currTile) {
        updatedTiles[tileId] = {
          ...currTile,
          value: Math.floor(currTile.value / 2),
        };
      }
    }

    preMoveState = null;

    return {
      state,
      challenge: { ...challenge, mergeCount: maxMerges },
      blocked: false,
      actions: Object.keys(updatedTiles).length > 0
        ? [{ type: "update_tiles" as const, tiles: updatedTiles }]
        : [],
    };
  },
  checkGameOver(): boolean {
    return false;
  },
};