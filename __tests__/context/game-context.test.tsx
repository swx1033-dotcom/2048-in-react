import { act, fireEvent, render } from "@testing-library/react";
import GameProvider from "@/context/game-context";
import Board from "@/components/board";
import Score from "@/components/score";

describe("GameProvider", () => {
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
      const { container } = render(
        <GameProvider>
          <Score />
          <Board />
        </GameProvider>,
      );

      expect(container.querySelector(".score > div")?.textContent).toEqual("0");
    });

    it("should refresh score after move", () => {
      const { container } = render(
        <GameProvider>
          <Score />
          <Board />
        </GameProvider>,
      );

      expect(container.querySelector(".score > div")?.textContent).toEqual("0");

      fireEvent.keyDown(container, {
        key: "ArrowUp",
        code: "ArrowUp",
      });

      expect(container.querySelector(".score > div")?.textContent).toEqual("4");
    });
  });

  describe("demo mode", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(Math, "random").mockReturnValue(0);
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it("should start automatic demo and perform moves", () => {
      const { container, getByRole, getByText } = render(
        <GameProvider>
          <Board />
        </GameProvider>,
      );

      fireEvent.click(getByRole("button", { name: "▶ 自动演示" }));

      expect(getByText("演示中…")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(container.querySelectorAll(".tile4")).toHaveLength(1);
    });

    it("should ignore manual input and stop on Escape", () => {
      const { container, getByRole, queryByText } = render(
        <GameProvider>
          <Score />
          <Board />
        </GameProvider>,
      );

      fireEvent.click(getByRole("button", { name: "▶ 自动演示" }));
      fireEvent.keyDown(window, {
        key: "ArrowUp",
        code: "ArrowUp",
      });

      expect(container.querySelector(".score > div")?.textContent).toEqual("0");

      fireEvent.keyDown(window, {
        key: "Escape",
        code: "Escape",
      });

      expect(queryByText("演示中…")).not.toBeInTheDocument();
      expect(getByRole("button", { name: "▶ 自动演示" })).toBeInTheDocument();
    });
  });
});
