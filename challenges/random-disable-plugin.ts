import { ChallengePlugin, MoveDirection } from "./types";

export const randomDisablePlugin: ChallengePlugin = {
  id: "randomDisable",
  name: "Random Direction Disable",
  description: "Random directions are disabled each turn",
  defaultConfig: {
    disableCount: 1,
  },

  initState: (config) => ({
    disabledDirections: [] as MoveDirection[],
  }),

  beforeMove: (state, direction, config, challengeState) => {
    let newChallengeState = { ...challengeState };
    
    if (newChallengeState.disabledDirections.includes(direction)) {
      return { allowed: false };
    }
    
    return { allowed: true };
  },

  afterMove: (state, direction, config, challengeState) => {
    let newChallengeState = { ...challengeState };
    const allDirections: MoveDirection[] = ["move_up", "move_down", "move_left", "move_right"];
    const disableCount = config.disableCount;
    
    const shuffled = [...allDirections].sort(() => Math.random() - 0.5);
    newChallengeState.disabledDirections = shuffled.slice(0, disableCount);
    
    return { newState: state, newChallengeState };
  },
};
