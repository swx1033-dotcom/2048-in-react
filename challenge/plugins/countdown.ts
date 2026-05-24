import {
  ChallengeConfig,
  ChallengePluginContext,
  ChallengePluginResult,
  ChallengeState,
} from "@/models/challenge";
import { ChallengePlugin, ConfigField } from "../types";

const configSchema = (): ConfigField[] => [
  {
    key: "totalSeconds",
    label: "Total time (seconds)",
    type: "number",
    defaultValue: 120,
    min: 30,
    max: 600,
    step: 30,
  },
];

export const countdownPlugin: ChallengePlugin = {
  id: "countdown",
  name: "Countdown",
  emoji: "⏱️",
  description:
    "Race against the clock! You have limited time to reach the target.",
  configFields: configSchema(),
  defaultConfig: {
    enabled: false,
    totalSeconds: 120,
  },
  getConfigSchema: configSchema,
  createDefaultState(): Partial<ChallengeState> {
    return {
      countdownSeconds: 0,
      countdownStarted: false,
    };
  },
  serializeState(state: Partial<ChallengeState>): Record<string, unknown> {
    return {
      countdownSeconds: state.countdownSeconds ?? 0,
      countdownStarted: state.countdownStarted ?? false,
    };
  },
  deserializeState(data: Record<string, unknown>): Partial<ChallengeState> {
    return {
      countdownSeconds: (data.countdownSeconds as number) ?? 0,
      countdownStarted: (data.countdownStarted as boolean) ?? false,
    };
  },
  onBeforeMove(
    ctx: ChallengePluginContext,
    config: ChallengeConfig,
  ): ChallengePluginResult {
    const { state, challenge } = ctx;
    const totalSeconds = (config.totalSeconds as number) ?? 120;

    if (!challenge.countdownStarted) {
      return {
        state,
        challenge: {
          ...challenge,
          countdownSeconds: totalSeconds,
          countdownStarted: true,
        },
        blocked: false,
        actions: [],
      };
    }

    return { state, challenge, blocked: false, actions: [] };
  },
  onAfterMove(ctx: ChallengePluginContext): ChallengePluginResult {
    return {
      state: ctx.state,
      challenge: ctx.challenge,
      blocked: false,
      actions: [],
    };
  },
  onTick(ctx: ChallengePluginContext): ChallengePluginResult {
    const { state, challenge } = ctx;

    if (!challenge.countdownStarted) {
      return { state, challenge, blocked: false, actions: [] };
    }

    const newSeconds = challenge.countdownSeconds - 1;
    return {
      state,
      challenge: { ...challenge, countdownSeconds: Math.max(0, newSeconds) },
      blocked: false,
      actions: [],
    };
  },
  checkGameOver(ctx: ChallengePluginContext): boolean {
    if (
      ctx.challenge.countdownStarted &&
      ctx.challenge.countdownSeconds <= 0
    ) {
      return true;
    }
    return false;
  },
};