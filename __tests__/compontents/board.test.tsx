import { fireEvent, render, waitFor } from "@testing-library/react";
import Board from "@/components/board";
import GameProvider from "@/context/game-context";
import Score from "@/components/score";

describe("Board", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the default 4x4 grid", async () => {
    const { container } = render(
      <GameProvider>
        <Board />
      </GameProvider>,
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".cell")).toHaveLength(16);
    });
  });

  it("renders a dynamic 6x6 grid after switching mode", async () => {
    const { container, getByText } = render(
      <GameProvider>
        <Score />
        <Board />
      </GameProvider>,
    );

    fireEvent.click(getByText("6×6"));

    await waitFor(() => {
      expect(container.querySelectorAll(".cell")).toHaveLength(36);
    });
  });
});
