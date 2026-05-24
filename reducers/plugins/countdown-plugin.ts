import { ChallengePlugin } from "../challenge-enhancer";

export const countdownPlugin: ChallengePlugin = {
  name: "countdown",
  onAfterAction: (state, action) => {
    const config = state.challengeState?.config?.countdown;
    if (!config?.enabled) return state;

    if (action.type === "reset_game") {
      return {
        ...state,
        challengeState: {
          ...state.challengeState,
          timeLeft: config.duration || 60
        }
      };
    }

    if (action.type === "plugin_action" && action.payload?.type === "tick") {
      const currentLeft = state.challengeState?.timeLeft ?? (config.duration || 60);
      const newLeft = currentLeft - 1;
      let nextState = {
        ...state,
        challengeState: {
          ...state.challengeState,
          timeLeft: Math.max(0, newLeft)
        }
      };
      if (newLeft <= 0) {
        nextState.status = "lost";
      }
      return nextState;
    }

    return state;
  }
};
