import { act, fireEvent, render, screen } from "@testing-library/react";
import GameProvider from "@/context/game-context";
import Board from "@/components/board";
import Score from "@/components/score";

describe("GameProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        return window.setTimeout(() => callback(performance.now()), 16);
      });
    jest
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((id: number) => {
        window.clearTimeout(id);
      });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("startGame", () => {
    it("should start the game with two tiles", () => {
      const { container } = render(
        <GameProvider>
          <Board />
        </GameProvider>,
      );

      expect(container.querySelectorAll(".tile")).toHaveLength(2);
    });
  });

  describe("getTiles", () => {
    it("should return tiles", () => {
      const { container } = render(
        <GameProvider>
          <Board />
        </GameProvider>,
      );

      expect(container.querySelectorAll(".tile")).toHaveLength(2);
    });
  });

  describe("moveTiles", () => {
    it("should move tiles and merge them together", () => {
      const { container } = render(
        <GameProvider>
          <Board />
        </GameProvider>,
      );

      expect(container.querySelectorAll(".tile4")).toHaveLength(0);
      expect(container.querySelectorAll(".tile2")).toHaveLength(2);

      fireEvent.keyDown(container, {
        key: "ArrowUp",
        code: "ArrowUp",
      });

      expect(container.querySelectorAll(".tile4")).toHaveLength(1);
      expect(container.querySelectorAll(".tile2")).toHaveLength(1);
    });
  });

  describe("score", () => {
    it("should return score", () => {
      render(
        <GameProvider>
          <Score />
          <Board />
        </GameProvider>,
      );

      expect(screen.getByTestId("score-value").textContent).toEqual("0");
    });

    it("should refresh score after move", () => {
      const { container } = render(
        <GameProvider>
          <Score />
          <Board />
        </GameProvider>,
      );

      expect(screen.getByTestId("score-value").textContent).toEqual("0");

      fireEvent.keyDown(container, {
        key: "ArrowUp",
        code: "ArrowUp",
      });

      expect(screen.getByTestId("score-value").textContent).toEqual("4");
    });
  });

  describe("tournament mode", () => {
    it("should auto move and update stats after timeout", () => {
      jest.spyOn(Math, "random").mockReturnValue(0);

      render(
        <GameProvider>
          <Score />
          <Board />
        </GameProvider>,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Tournament mode" }),
      );

      expect(screen.getByTestId("remaining-time").textContent).toEqual("5.0s");

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId("remaining-time").textContent).not.toEqual(
        "5.0s",
      );

      act(() => {
        jest.advanceTimersByTime(4200);
      });

      expect(screen.getByTestId("timeout-count").textContent).toEqual("1");
      expect(screen.getByTestId("average-thinking-time").textContent).toEqual(
        "5.0s",
      );
    });
  });
});
