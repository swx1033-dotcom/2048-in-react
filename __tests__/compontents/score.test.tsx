import { render, screen } from "@testing-library/react";
import GameProvider from "@/context/game-context";
import Board from "@/components/board";
import Score from "@/components/score";

describe("Score", () => {
  it("should display score", () => {
    render(
      <GameProvider>
        <Score />
        <Board />
      </GameProvider>,
    );

    expect(screen.getByTestId("score-value").textContent).toEqual("0");
  });
});
