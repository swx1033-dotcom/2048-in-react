import { render, waitFor } from "@testing-library/react";
import Tile from "@/components/tile";
import GameProvider from "@/context/game-context";

describe("Tile", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("should render with correct position and value", () => {
    const position: [number, number] = [1, 2];
    const value = 2048;

    const { container } = render(
      <GameProvider>
        <Tile position={position} value={value} />
      </GameProvider>,
    );

    const tile: HTMLDivElement = container.querySelector(".tile") as HTMLDivElement;
    expect(tile.textContent).toEqual("2048");
    expect(tile.className).toContain("tile2048");
  });

  it("should apply animation when value changes", async () => {
    const position: [number, number] = [0, 0];
    const initialValue = 2;
    const updatedValue = 4;

    const { getByText, rerender } = render(
      <GameProvider>
        <Tile position={position} value={initialValue} />
      </GameProvider>,
    );

    const tileElement = getByText(`${initialValue}`);
    expect(tileElement).toBeInTheDocument();

    await waitFor(() => {
      expect(tileElement).toHaveStyle({
        transform: "scale(1)",
      });
    });
    rerender(
      <GameProvider>
        <Tile position={position} value={updatedValue} />
      </GameProvider>,
    );

    await waitFor(() => {
      expect(tileElement).toHaveStyle({
        transform: "scale(1.1)",
      });
    });

    await waitFor(() => {
      expect(tileElement).toHaveStyle({
        transform: "scale(1)",
      });
    });
  });
});
