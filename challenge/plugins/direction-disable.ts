import {
  ChallengeConfig,
  ChallengePluginContext,
  ChallengePluginResult,
  ChallengeState,
  Direction,
} from "@/models/challenge";
import { ChallengePlugin, ConfigField } from "../types";

const allDirections: Direction[] = [
  "move_up",
  "move_down",
  "move_left",
  "move_right",
];

function randomDirection(): Direction {
  return allDirections[Math.floor(Math.random() * allDirections.length)];
}

const configSchema = (): ConfigField[] => [
  {
    key: "disableDuration",
    label: "Disable duration (turns)",
    type: "number",
    defaultValue: 3,
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: "cooldownTurns",
    label: "Cooldown between disables (turns)",
    type: "number",
    defaultValue: 5,
    min: 2,
    max: 20,
    step: 1,
  },
];

export const directionDisablePlugin: ChallengePlugin = {
  id: "direction-disable",
  name: "Disabled Direction",
  emoji: "🚫",
  description:
    "A random direction is periodically disabled, forcing creative play.",
  configFields: configSchema(),
  defaultConfig: {
    enabled: false,
    disableDuration: 3,
    cooldownTurns: 5,
  },
  getConfigSchema: configSchema,
  createDefaultState(): Partial<ChallengeState> {
    return {
      disabledDirection: null,
      disabledDirectionTimer: 0,
    };
  },
  serializeState(state: Partial<ChallengeState>): Record<string, unknown> {
    return {
      disabledDirection: state.disabledDirection ?? null,
      disabledDirectionTimer: state.disabledDirectionTimer ?? 0,
    };
  },
  deserializeState(data: Record<string, unknown>): Partial<ChallengeState> {
    return {
      disabledDirection: (data.disabledDirection as Direction | null) ?? null,
      disabledDirectionTimer: (data.disabledDirectionTimer as number) ?? 0,
    };
  },
  onBeforeMove(
    ctx: ChallengePluginContext,
  ): ChallengePluginResult {
    const { state, challenge, movedDirection } = ctx;

    if (
      challenge.disabledDirection &&
      movedDirection === challenge.disabledDirection
    ) {
      return {
        state,
        challenge,
        blocked: true,
        blockReason: "This direction is disabled!",
        actions: [],
      };
    }

    return { state, challenge, blocked: false, actions: [] };
  },
  onAfterMove(
    ctx: ChallengePluginContext,
    config: ChallengeConfig,
  ): ChallengePluginResult {
    const { state, challenge } = ctx;
    const disableDuration = (config.disableDuration as number) || 3;
    const cooldownTurns = (config.cooldownTurns as number) || 5;

    if (challenge.disabledDirection) {
      const newTimer = challenge.disabledDirectionTimer - 1;
      if (newTimer <= 0) {
        return {
          state,
          challenge: {
            ...challenge,
            disabledDirection: null,
            disabledDirectionTimer: cooldownTurns,
          },
          blocked: false,
          actions: [],
        };
      }
      return {
        state,
        challenge: {
          ...challenge,
          disabledDirectionTimer: newTimer,
        },
        blocked: false,
        actions: [],
      };
    }

    if (challenge.disabledDirectionTimer > 0) {
      const newTimer = challenge.disabledDirectionTimer - 1;
      if (newTimer <= 0) {
        const newDir = randomDirection();
        return {
          state,
          challenge: {
            ...challenge,
            disabledDirection: newDir,
            disabledDirectionTimer: disableDuration,
          },
          blocked: false,
          actions: [],
        };
      }
      return {
        state,
        challenge: {
          ...challenge,
          disabledDirectionTimer: newTimer,
        },
        blocked: false,
        actions: [],
      };
    }

    const newDir = randomDirection();
    return {
      state,
      challenge: {
        ...challenge,
        disabledDirection: newDir,
        disabledDirectionTimer: disableDuration,
      },
      blocked: false,
      actions: [],
    };
  },
  getDisabledDirections(ctx: ChallengePluginContext): Direction[] {
    if (ctx.challenge.disabledDirection) {
      return [ctx.challenge.disabledDirection];
    }
    return [];
  },
  checkGameOver(): boolean {
    return false;
  },
};