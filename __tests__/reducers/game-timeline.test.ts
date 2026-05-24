import gameReducer, {
  GameSnapshot,
  State,
  getInitialState,
} from "@/reducers/game-reducer";

function createSnapshot(score: number): GameSnapshot {
  const state = getInitialState();

  return {
    board: state.board.map((row) => [...row]),
    tiles: {},
    tilesByIds: [],
    score,
    status: "ongoing",
  };
}

describe("game timeline", () => {
  it("should save complete snapshots and jump directly to a historical step", () => {
    let state = gameReducer(getInitialState(), {
      type: "start_game",
      tiles: [
        { position: [0, 1], value: 2 },
        { position: [0, 2], value: 2 },
      ],
    });

    state = gameReducer(state, { type: "move_up" });
    state = gameReducer(state, { type: "clean_up" });
    state = gameReducer(state, {
      type: "create_tile",
      tile: { position: [1, 1], value: 2 },
    });
    state = gameReducer(state, { type: "update_status", status: "won" });

    const historicalSnapshot = state.history[1];

    state = gameReducer(state, { type: "jump_to_history", index: 1 });

    expect(state.board).toEqual(historicalSnapshot.board);
    expect(state.score).toEqual(historicalSnapshot.score);
    expect(state.status).toEqual(historicalSnapshot.status);
    expect(state.historyIndex).toEqual(1);
  });

  it("should discard future history when creating a new branch after a jump", () => {
    let state = gameReducer(getInitialState(), {
      type: "start_game",
      tiles: [
        { position: [0, 1], value: 2 },
        { position: [0, 2], value: 2 },
      ],
    });

    state = gameReducer(state, { type: "move_up" });
    state = gameReducer(state, { type: "clean_up" });
    state = gameReducer(state, {
      type: "create_tile",
      tile: { position: [1, 1], value: 2 },
    });

    const branchedHistoryLength = state.history.length;

    state = gameReducer(state, { type: "jump_to_history", index: 1 });
    state = gameReducer(state, {
      type: "create_tile",
      tile: { position: [3, 3], value: 2 },
    });

    expect(state.history.length).toEqual(branchedHistoryLength);
    expect(state.historyIndex).toEqual(branchedHistoryLength - 1);
    expect(state.board[3][3]).toBeDefined();
    expect(state.history[state.history.length - 1].board[1][1]).toBeUndefined();
  });

  it("should keep the timeline capped at 50 snapshots", () => {
    const baseState = getInitialState();
    const history = Array.from({ length: 50 }, (_, index) => createSnapshot(index));
    const state: State = {
      ...baseState,
      history,
      historyIndex: 49,
      score: 49,
      status: "ongoing",
    };

    const nextState = gameReducer(state, {
      type: "create_tile",
      tile: { position: [0, 0], value: 2 },
    });

    expect(nextState.history).toHaveLength(50);
    expect(nextState.history[0].score).toEqual(1);
    expect(nextState.historyIndex).toEqual(49);
  });
});
