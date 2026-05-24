import { ChallengePlugin } from "../challenge-enhancer";

export const decayPlugin: ChallengePlugin = {
  name: "decay",
  onAfterAction: (state, action) => {
    const config = state.challengeState?.config?.decay;
    if (!config?.enabled) return state;

    if (action.type === "clean_up") {
      let changed = false;
      const newTiles = { ...state.tiles };

      for (const id of state.tilesByIds) {
        const tile = newTiles[id];
        if (!tile.isObstacle && tile.value > 2) {
          newTiles[id] = { ...tile, value: Math.max(2, Math.floor(tile.value / (config.rate || 2))) };
          changed = true;
        }
      }

      if (changed) {
        return { ...state, tiles: newTiles };
      }
    }
    return state;
  }
};
