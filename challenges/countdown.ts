import { defaultCountdownSeconds } from "@/constants";
import { ChallengePlugin, ChallengeConfig, GameState, ChallengeEffect } from "@/models/challenge";

const countdownChallenge: ChallengePlugin = {
  id: "countdown",
  name: "Countdown",
  description: "Race against the clock to reach 2048",
  icon: "⏱️",
  defaultConfig: {
    timeLimit: defaultCountdownSeconds,
  },

  afterMove(
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): ChallengeEffect[] {
    return [];
  },

  checkGameOver(
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): boolean | null {
    const timeRemaining = pluginState.timeRemaining as number | undefined;
    if (isNil(timeRemaining)) return null;
    return timeRemaining <= 0;
  },

  initPluginState(config: ChallengeConfig): Record<string, unknown> {
    return {
      timeRemaining: (config.timeLimit as number) || defaultCountdownSeconds,
      isRunning: false,
    };
  },
};

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export default countdownChallenge;
