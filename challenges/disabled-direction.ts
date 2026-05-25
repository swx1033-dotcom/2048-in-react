import { defaultDisableDuration } from "@/constants";
import { ChallengePlugin, ChallengeConfig, GameState, ChallengeEffect, MoveDirection } from "@/models/challenge";

const allDirections: MoveDirection[] = ["move_up", "move_down", "move_left", "move_right"];

const moveActions = new Set<string>(allDirections);

const disabledDirectionChallenge: ChallengePlugin = {
  id: "disabled_direction",
  name: "Disabled Direction",
  description: "A random direction is disabled each turn",
  icon: "🚫",
  defaultConfig: {
    disableDuration: defaultDisableDuration,
  },

  beforeAction(
    action: { type: string; [key: string]: unknown },
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): { type: string; [key: string]: unknown } | null {
    if (!moveActions.has(action.type)) {
      return action;
    }

    const disabledDirections = (pluginState.disabledDirections as MoveDirection[]) || [];

    if (disabledDirections.includes(action.type as MoveDirection)) {
      return null;
    }

    return action;
  },

  afterMove(
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): ChallengeEffect[] {
    const available = allDirections.filter(
      (d) => d !== (pluginState.lastDisabled as string),
    );
    const randomIndex = Math.floor(Math.random() * available.length);
    const newDisabled = available[randomIndex];

    return [
      {
        type: "set_plugin_state",
        payload: {
          pluginId: "disabled_direction",
          state: {
            disabledDirections: [newDisabled],
            lastDisabled: newDisabled,
          },
        },
      },
    ];
  },

  getDisabledDirections(
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): MoveDirection[] {
    return (pluginState.disabledDirections as MoveDirection[]) || [];
  },

  initPluginState(config: ChallengeConfig): Record<string, unknown> {
    const randomIndex = Math.floor(Math.random() * allDirections.length);
    const initialDisabled = allDirections[randomIndex];
    return {
      disabledDirections: [initialDisabled],
      lastDisabled: initialDisabled,
    };
  },
};

export default disabledDirectionChallenge;
