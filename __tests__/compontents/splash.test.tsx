import { render, screen } from "@testing-library/react";
import Splash from "@/components/splash";
import { GameContext } from "@/context/game-context";

describe("Splash", () => {
  it("renders the win modal with continue and restart actions", () => {
    render(
      <GameContext.Provider
        value={{
          score: 0,
          status: "won",
          moveTiles: () => {},
          getTiles: () => [],
          startGame: () => {},
          continueGame: () => {},
        }}
      >
        <Splash />
      </GameContext.Provider>,
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("2048!")).toBeDefined();
    expect(screen.getByRole("button", { name: "继续挑战" })).toBeDefined();
    expect(screen.getByRole("button", { name: "重新开始" })).toBeDefined();
  });

  it("renders the game over modal with retry action", () => {
    render(
      <GameContext.Provider
        value={{
          score: 0,
          status: "lost",
          moveTiles: () => {},
          getTiles: () => [],
          startGame: () => {},
          continueGame: () => {},
        }}
      >
        <Splash />
      </GameContext.Provider>,
    );

    expect(screen.getByText("Game Over")).toBeDefined();
    expect(screen.getByRole("button", { name: "重试" })).toBeDefined();
  });
});
