import { fireEvent, render } from "@testing-library/react";
import Board from "@/components/board";
import GameProvider from "@/context/game-context";

describe("Board timeline", () => {
  it("should preview and commit historical snapshots with the timeline slider", () => {
    const { container, getByLabelText } = render(
      <GameProvider>
        <Board />
      </GameProvider>,
    );

    const timeline = getByLabelText("Timeline");

    expect(container.querySelectorAll(".tile")).toHaveLength(2);

    fireEvent.change(timeline, { target: { value: "0" } });

    expect(container.querySelectorAll(".tile")).toHaveLength(0);

    fireEvent.mouseUp(timeline);

    expect(container.querySelectorAll(".tile")).toHaveLength(0);
  });
});
