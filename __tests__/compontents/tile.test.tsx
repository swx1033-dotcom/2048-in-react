import { render, waitFor } from "@testing-library/react";
import Tile from "@/components/tile";

describe("Tile", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders with dynamic CSS positioning variables", () => {
    const position: [number, number] = [1, 2];
    const value = 2048;

    const { container } = render(<Tile position={position} value={value} />);

    const tile: HTMLDivElement = container.firstChild as HTMLDivElement;
    expect(tile.textContent).toEqual("2048");
    expect(tile.className).toEqual("tile tile2048");
    expect(tile).toHaveStyle({
      "--position-x": "1",
      "--position-y": "2",
      zIndex: "2048",
    });
  });

  it("applies animation when value changes", async () => {
    const position: [number, number] = [0, 0];
    const initialValue = 2;
    const updatedValue = 4;

    const { getByText, rerender } = render(
      <Tile position={position} value={initialValue} />,
    );

    const tileElement = getByText(`${initialValue}`);
    expect(tileElement).toBeInTheDocument();

    rerender(<Tile position={position} value={updatedValue} />);

    await waitFor(() => {
      expect(tileElement).toHaveStyle({
        "--tile-scale": "1.08",
      });
    });

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(tileElement).toHaveStyle({
        "--tile-scale": "1",
      });
    });
  });
});
