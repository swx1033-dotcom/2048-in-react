import { ChallengePlugin } from "./types";

export const countdownPlugin: ChallengePlugin = {
  id: "countdown",
  name: "Countdown Mode",
  description: "Game ends after a certain number of moves",
  defaultConfig: {
    maxMoves: 50,
  },

  initState: (config) => ({
    movesRemaining: config.maxMoves,
  }),

  afterMove: (state, direction, config, challengeState) => {
    let newChallengeState = { ...challengeState };
    newChallengeState.movesRemaining = (challengeState.movesRemaining || config.maxMoves) - 1;
    return { newState: state, newChallengeState };
  },

  checkGameOver: (state, config, challengeState) => {
    if (challengeState.movesRemaining <= 0) {
      return { isOver: true, reason: "Countdown expired!" };
    }
    return { isOver: false };
  },
};
