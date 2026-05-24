import { ChallengePlugin } from "../challenge-enhancer";

export const disableDirectionPlugin: ChallengePlugin = {
  name: "disable_direction",
  onBeforeAction: (state, action) => {
    const config = state.challengeState?.config?.disableDirection;
    if (!config?.enabled) return { state };

    if (action.type.startsWith("move_")) {
      const disabledDir = state.challengeState?.disabledDirection;
      if (action.type === disabledDir) {
        return { state, cancelAction: true };
      }
    }
    return { state };
  },
  onAfterAction: (state, action) => {
    const config = state.challengeState?.config?.disableDirection;
    if (!config?.enabled) return state;

    if (action.type === "clean_up" || action.type === "reset_game") {
      const dirs = ["move_up", "move_down", "move_left", "move_right"];
      const nextDir = dirs[Math.floor(Math.random() * dirs.length)];
      return {
        ...state,
        challengeState: {
          ...state.challengeState,
          disabledDirection: nextDir
        }
      };
    }
    return state;
  }
};
