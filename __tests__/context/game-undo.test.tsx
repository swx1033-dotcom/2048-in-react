import { act, fireEvent, render } from "@testing-library/react";
import Board from "@/components/board";
import Score from "@/components/score";
import { mergeAnimationDuration } from "@/constants";
import GameProvider from "@/context/game-context";

describe("Game undo", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should restore score and tiles after clicking Undo", () => {
    const { container, getByRole } = render(
      <GameProvider>
        <Score />
        <Board />
      </GameProvider>,
    );

    fireEvent.keyDown(window, {
      key: "ArrowUp",
      code: "ArrowUp",
    });

    act(() => {
      jest.advanceTimersByTime(mergeAnimationDuration);
    });

    expect(container.querySelector(".score > div")?.textContent).toEqual("4");
    expect(container.querySelectorAll(".tile4")).toHaveLength(1);
    expect(container.querySelectorAll(".tile2")).toHaveLength(1);

    fireEvent.click(getByRole("button", { name: "Undo" }));

    expect(container.querySelector(".score > div")?.textContent).toEqual("0");
    expect(container.querySelectorAll(".tile4")).toHaveLength(0);
    expect(container.querySelectorAll(".tile2")).toHaveLength(2);
  });

  it("should support Ctrl+Z and stop undo at the initial state", () => {
    const { container, getByRole } = render(
      <GameProvider>
        <Score />
        <Board />
      </GameProvider>,
    );
    const undoButton = getByRole("button", { name: "Undo" }) as HTMLButtonElement;

    expect(undoButton.disabled).toBeTruthy();

    fireEvent.keyDown(window, {
      key: "ArrowUp",
      code: "ArrowUp",
    });

    act(() => {
      jest.advanceTimersByTime(mergeAnimationDuration);
    });

    expect(undoButton.disabled).toBeFalsy();

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
    });

    expect(container.querySelector(".score > div")?.textContent).toEqual("0");
    expect(container.querySelectorAll(".tile2")).toHaveLength(2);
    expect(undoButton.disabled).toBeTruthy();

    fireEvent.keyDown(window, {
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
    });

    expect(container.querySelector(".score > div")?.textContent).toEqual("0");
    expect(container.querySelectorAll(".tile4")).toHaveLength(0);
    expect(container.querySelectorAll(".tile2")).toHaveLength(2);
  });

  it("should allow undo after a touch move and cancel pending finalize state", () => {
    const { container, getByRole } = render(
      <GameProvider>
        <Score />
        <Board />
      </GameProvider>,
    );
    const board = container.querySelector(".board") as HTMLElement;

    fireEvent.touchStart(board, {
      touches: [{ clientX: 120, clientY: 120 }],
    });
    fireEvent.touchEnd(board, {
      changedTouches: [{ clientX: 120, clientY: 0 }],
    });

    expect(container.querySelector(".score > div")?.textContent).toEqual("4");
    expect(container.querySelectorAll(".tile4")).toHaveLength(1);
    expect(container.querySelectorAll(".tile2")).toHaveLength(1);

    fireEvent.click(getByRole("button", { name: "Undo" }));

    act(() => {
      jest.advanceTimersByTime(mergeAnimationDuration * 2);
    });

    expect(container.querySelector(".score > div")?.textContent).toEqual("0");
    expect(container.querySelectorAll(".tile4")).toHaveLength(0);
    expect(container.querySelectorAll(".tile2")).toHaveLength(2);
  });
});
