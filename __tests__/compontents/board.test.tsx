import { render } from "@testing-library/react";
import Board from "@/components/board";
import GameProvider from "@/context/game-context";
import { defaultBoardSize } from "@/constants";

describe("Board", () => {
  it("should render board with correct number of cells for default size", () => {
    const { container } = render(
      <GameProvider>
        <Board />
      </GameProvider>,
    );
    const cellElements = container.querySelectorAll(".cell");

    expect(cellElements.length).toEqual(defaultBoardSize * defaultBoardSize);
  });

  it("should render board with 2 tiles", async () => {
    const { container } = render(
      <GameProvider>
        <Board />
      </GameProvider>,
    );
    const tiles = container.querySelectorAll(".tile");

    expect(tiles.length).toEqual(2);
  });
});
