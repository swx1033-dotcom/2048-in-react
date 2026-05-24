import { createMoveAction, GameAction } from "@/inputs/action";

describe("action", () => {
  describe("createMoveAction", () => {
    it.each([
      ["move_up", "move_up"],
      ["move_down", "move_down"],
      ["move_left", "move_left"],
      ["move_right", "move_right"],
      ["ArrowUp", "move_up"],
      ["ArrowDown", "move_down"],
      ["ArrowLeft", "move_left"],
      ["ArrowRight", "move_right"],
    ])("should map %s to %s", (input, expected) => {
      const result = createMoveAction(input);

      expect(result).toEqual({ type: expected });
    });

    it("should return null for unknown direction", () => {
      const result = createMoveAction("unknown");

      expect(result).toBeNull();
    });
  });
});