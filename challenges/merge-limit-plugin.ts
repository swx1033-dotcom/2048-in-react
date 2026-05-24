import { ChallengePlugin } from "./types";
import { Tile } from "@/models/tile";

export const mergeLimitPlugin: ChallengePlugin = {
  id: "mergeLimit",
  name: "Merge Limit",
  description: "Tiles can only be merged a limited number of times",
  defaultConfig: {
    maxMerges: 3,
  },

  initState: () => ({}),

  beforeMerge: (tile1: Tile, tile2: Tile, state, config, challengeState) => {
    const maxMerges = config.maxMerges;
    const totalMerges = (tile1.mergedCount || 0) + (tile2.mergedCount || 0);

    if (totalMerges >= maxMerges) {
      return { allowed: false };
    }

    return { allowed: true };
  },
};
