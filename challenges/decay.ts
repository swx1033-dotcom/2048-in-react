import { isNil } from "lodash";
import { defaultDecayAmount, defaultDecayInterval } from "@/constants";
import { ChallengePlugin, ChallengeConfig, GameState, ChallengeEffect } from "@/models/challenge";

const decayChallenge: ChallengePlugin = {
  id: "decay",
  name: "Decay",
  description: "Tile values decrease over time",
  icon: "📉",
  defaultConfig: {
    decayAmount: defaultDecayAmount,
    decayInterval: defaultDecayInterval,
  },

  afterMove(
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): ChallengeEffect[] {
    const effects: ChallengeEffect[] = [];
    const moveCount = (pluginState.moveCount as number) || 0;
    const decayAmount = (config.decayAmount as number) || defaultDecayAmount;
    const decayInterval = (config.decayInterval as number) || defaultDecayInterval;

    const newMoveCount = moveCount + 1;

    effects.push({
      type: "set_plugin_state",
      payload: {
        pluginId: "decay",
        state: { moveCount: newMoveCount },
      },
    });

    if (newMoveCount % decayInterval !== 0) {
      return effects;
    }

    for (const tileId of gameState.tilesByIds) {
      const tile = gameState.tiles[tileId];
      if (isNil(tile) || tile.isObstacle) continue;

      const newValue = tile.value - decayAmount;

      if (newValue <= 0) {
        effects.push({
          type: "remove_tile",
          payload: { tileId },
        });
      } else {
        effects.push({
          type: "update_tile",
          payload: { tileId, value: newValue },
        });
      }
    }

    return effects;
  },

  initPluginState(config: ChallengeConfig): Record<string, unknown> {
    return {
      moveCount: 0,
    };
  },
};

export default decayChallenge;
