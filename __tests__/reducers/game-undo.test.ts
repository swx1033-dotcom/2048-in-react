import gameReducer, { initialState } from "@/reducers/game-reducer";
import { act, renderHook } from "@testing-library/react";
import { useReducer } from "react";

describe("gameReducer undo", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should replace the old redo branch after undo and a new move", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const { result } = renderHook(() =>
      useReducer(gameReducer, initialState),
    );
    const [, dispatch] = result.current;

    act(() => {
      dispatch({ type: "start_game" });
      dispatch({ type: "move_up" });
      dispatch({ type: "finalize_move" });
      dispatch({ type: "undo" });
      dispatch({ type: "move_down" });
      dispatch({ type: "finalize_move" });
    });

    const [stateAfterNewMove] = result.current;
    expect(stateAfterNewMove.history).toHaveLength(2);
    expect(stateAfterNewMove.score).toBe(0);

    act(() => {
      dispatch({ type: "undo" });
    });

    const [stateAfterUndo] = result.current;
    expect(stateAfterUndo.score).toBe(0);
    expect(stateAfterUndo.history).toHaveLength(1);
    expect(Object.values(stateAfterUndo.tiles).map((tile) => tile.value)).toEqual([
      2,
      2,
    ]);
  });
});
