import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { gameStateStorageKey } from "@/constants";
import GameProvider from "@/context/game-context";
import Board from "@/components/board";
import Score from "@/components/score";

describe("GameProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("starts with two tiles", async () => {
    const { container } = render(
      <GameProvider>
        <Board />
      </GameProvider>,
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".tile")).toHaveLength(2);
    });
  });

  it("keeps keyboard movement working after initialization", async () => {
    const { container } = render(
      <GameProvider>
        <Board />
      </GameProvider>,
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".tile2")).toHaveLength(2);
    });

    act(() => {
      fireEvent.keyDown(window, {
        key: "ArrowUp",
        code: "ArrowUp",
      });
    });

    expect(container.querySelectorAll(".tile4")).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(120);
    });

    await waitFor(() => {
      expect(container.querySelectorAll(".tile")).toHaveLength(2);
    });
  });

  it("migrates old localStorage saves and preserves score", async () => {
    window.localStorage.setItem(
      gameStateStorageKey,
      JSON.stringify({
        board: [
          ["tile-a", undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined],
        ],
        tiles: {
          "tile-a": {
            position: [0, 0],
            value: 64,
          },
        },
        score: 256,
        status: "ongoing",
      }),
    );

    const { container } = render(
      <GameProvider>
        <Score />
        <Board />
      </GameProvider>,
    );

    await waitFor(() => {
      expect(container.querySelector(".score > div")?.textContent).toEqual("256");
    });

    expect(container.querySelectorAll(".cell")).toHaveLength(16);
    expect(container.querySelectorAll(".tile")).toHaveLength(1);
  });
});
