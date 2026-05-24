import { ChallengePlugin, ChallengeState, ChallengeConfig } from "@/challenges/types";

export type ActiveChallenge = {
  pluginId: string;
  config: ChallengeConfig;
  state: ChallengeState;
};

export type ChallengeStateType = {
  activeChallenges: ActiveChallenge[];
  history: any[];
  historyIndex: number;
};

export const initialChallengeState: ChallengeStateType = {
  activeChallenges: [],
  history: [],
  historyIndex: -1,
};

type ChallengeAction =
  | { type: "enable_challenge"; plugin: ChallengePlugin; config?: ChallengeConfig }
  | { type: "disable_challenge"; pluginId: string }
  | { type: "update_challenge_state"; pluginId: string; newState: ChallengeState }
  | { type: "save_to_history"; state: any }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset_challenges" };

export default function challengeReducer(
  state: ChallengeStateType = initialChallengeState,
  action: ChallengeAction
) {
  switch (action.type) {
    case "enable_challenge": {
      const existing = state.activeChallenges.find(
        (c) => c.pluginId === action.plugin.id
      );
      if (existing) return state;

      const challengeState = action.plugin.initState
        ? action.plugin.initState(action.config || action.plugin.defaultConfig)
        : {};

      return {
        ...state,
        activeChallenges: [
          ...state.activeChallenges,
          {
            pluginId: action.plugin.id,
            config: action.config || action.plugin.defaultConfig,
            state: challengeState,
          },
        ],
      };
    }
    case "disable_challenge": {
      return {
        ...state,
        activeChallenges: state.activeChallenges.filter(
          (c) => c.pluginId !== action.pluginId
        ),
      };
    }
    case "update_challenge_state": {
      return {
        ...state,
        activeChallenges: state.activeChallenges.map((c) =>
          c.pluginId === action.pluginId
            ? { ...c, state: action.newState }
            : c
        ),
      };
    }
    case "save_to_history": {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.state);
      const maxHistory = 50;
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      }
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case "undo": {
      if (state.historyIndex <= 0) return state;
      return {
        ...state,
        historyIndex: state.historyIndex - 1,
      };
    }
    case "redo": {
      if (state.historyIndex >= state.history.length - 1) return state;
      return {
        ...state,
        historyIndex: state.historyIndex + 1,
      };
    }
    case "reset_challenges":
      return initialChallengeState;
    default:
      return state;
  }
}
