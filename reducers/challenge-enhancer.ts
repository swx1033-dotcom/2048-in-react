import { Action, State } from "./game-reducer";

export interface ChallengePlugin {
  name: string;
  onBeforeAction?: (state: State, action: Action) => { state: State; cancelAction?: boolean };
  onAfterAction?: (state: State, action: Action) => State;
  checkGameOver?: (state: State) => "won" | "lost" | "ongoing" | undefined;
}

export function withChallenges(
  reducer: (state: State, action: Action) => State,
  plugins: ChallengePlugin[]
) {
  return function (state: State, action: Action): State {
    let nextState = state;
    let cancel = false;

    // Before Action
    for (const plugin of plugins) {
      if (plugin.onBeforeAction) {
        const result = plugin.onBeforeAction(nextState, action);
        nextState = result.state;
        if (result.cancelAction) {
          cancel = true;
        }
      }
    }

    if (cancel) {
      return nextState;
    }

    // Standard Reducer
    nextState = reducer(nextState, action);

    // After Action
    for (const plugin of plugins) {
      if (plugin.onAfterAction) {
        nextState = plugin.onAfterAction(nextState, action);
      }
    }

    // Check Game Over Override
    for (const plugin of plugins) {
      if (plugin.checkGameOver) {
        const status = plugin.checkGameOver(nextState);
        if (status) {
          nextState = { ...nextState, status };
        }
      }
    }

    return nextState;
  };
}
