import { ChallengePlugin } from "./types";
import { TileMap } from "@/models/tile";

export const decayPlugin: ChallengePlugin = {
  id: "decay",
  name: "Tile Decay",
  description: "Tiles lose value over time",
  defaultConfig: {
    decayRate: 1,
    decayInterval: 2,
    minValue: 2,
  },

  initState: () => ({
    moveCount: 0,
  }),

  afterMove: (state, direction, config, challengeState) => {
    const { decayRate, decayInterval, minValue } = config;
    let newState = { ...state };
    let newChallengeState = { ...challengeState };

    newChallengeState.moveCount = (challengeState.moveCount || 0) + 1;

    if (newChallengeState.moveCount % decayInterval === 0) {
      const newTiles: TileMap = {};

      Object.entries(newState.tiles).forEach(([id, tile]) => {
        if (tile.type === "normal" && tile.value > minValue) {
          let newValue = tile.value;
          for (let i = 0; i < decayRate && newValue > minValue; i++) {
            newValue = newValue / 2;
          }
          newTiles[id] = {
            ...tile,
            value: Math.max(minValue, newValue),
          };
        } else {
          newTiles[id] = { ...tile };
        }
      });

      newState = {
        ...newState,
        tiles: newTiles,
      };
    }

    return { newState, newChallengeState };
  },
};
