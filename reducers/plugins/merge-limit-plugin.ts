import { ChallengePlugin } from "../challenge-enhancer";
import gameReducer from "../game-reducer";

export const mergeLimitPlugin: ChallengePlugin = {
  name: "merge_limit",
  onBeforeAction: (state, action) => {
    const config = state.challengeState?.config?.mergeLimit;
    if (!config?.enabled) return { state };

    if (action.type.startsWith("move_")) {
      const testState = gameReducer(state, action);
      
      const tilesBefore = state.board.flat().filter(Boolean).length;
      const tilesAfter = testState.board.flat().filter(Boolean).length;
      const merges = tilesBefore - tilesAfter;

      if (merges > (config.limit || 1)) {
        return { state, cancelAction: true };
      }
    }
    return { state };
  }
};
