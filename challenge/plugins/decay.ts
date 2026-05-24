import { isNil } from "lodash";
import {
  ChallengeConfig,
  ChallengePluginContext,
  ChallengePluginResult,
  ChallengeState,
} from "@/models/challenge";
import { ChallengePlugin, ConfigField } from "../types";

const configSchema = (): ConfigField[] => [
  {
    key: "decayInterval",
    label: "Decay every N turns",
    type: "number",
    defaultValue: 3,
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: "decayAmount",
    label: "Decay amount (divisor)",
    type: "number",
    defaultValue: 2,
    min: 2,
    max: 4,
    step: 1,
  },
  {
    key: "decayChance",
    label: "Chance per tile (%)",
    type: "number",
    defaultValue: 30,
    min: 10,
    max: 100,
    step: 10,
  },
];

export const decayPlugin: ChallengePlugin = {
  id: "decay",
  name: "Tile Decay",
  emoji: "🍂",
  description: "Tiles gradually lose value over time. Keep merging to survive!",
  configFields: configSchema(),
  defaultConfig: {
    enabled: false,
    decayInterval: 3,
    decayAmount: 2,
    decayChance: 30,
  },
  getConfigSchema: configSchema,
  createDefaultState(): Partial<ChallengeState> {
    return {
      decayCounter: 0,
    };
  },
  serializeState(state: Partial<ChallengeState>): Record<string, unknown> {
    return {
      decayCounter: state.decayCounter ?? 0,
    };
  },
  deserializeState(data: Record<string, unknown>): Partial<ChallengeState> {
    return {
      decayCounter: (data.decayCounter as number) ?? 0,
    };
  },
  onBeforeMove(ctx: ChallengePluginContext): ChallengePluginResult {
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
    const interval = (config.decayInterval as number) || 3;
    const divisor = (config.decayAmount as number) || 2;
    const chance = ((config.decayChance as number) || 30) / 100;

    const newCounter = challenge.decayCounter + 1;
    if (newCounter < interval) {
      return {
        state,
        challenge: { ...challenge, decayCounter: newCounter },
        blocked: false,
        actions: [],
      };
    }

    const updatedTiles: Record<
      string,
      { id?: string; position: [number, number]; value: number }
    > = {};
    let changed = false;

    for (const tileId of state.tilesByIds) {
      const tile = state.tiles[tileId];
      if (isNil(tile)) continue;
      if (tile.value <= 2) continue;

      if (Math.random() < chance) {
        const newValue = Math.max(2, Math.floor(tile.value / divisor));
        updatedTiles[tileId] = { ...tile, value: newValue };
        changed = true;
      }
    }

    return {
      state,
      challenge: { ...challenge, decayCounter: 0 },
      blocked: false,
      actions: changed
        ? [{ type: "update_tiles" as const, tiles: updatedTiles }]
        : [],
    };
  },
  checkGameOver(): boolean {
    return false;
  },
};