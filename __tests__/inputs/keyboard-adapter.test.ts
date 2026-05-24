import { createKeyboardAdapter } from "@/inputs/keyboard-adapter";
import { GameAction } from "@/inputs/action";

describe("KeyboardAdapter", () => {
  let handler: jest.Mock;
  let cleanup: () => void;

  beforeEach(() => {
    handler = jest.fn();
  });

  afterEach(() => {
    cleanup?.();
  });

  describe("Arrow keys", () => {
    it.each([
      { key: "ArrowUp", expected: "move_up" },
      { key: "ArrowDown", expected: "move_down" },
      { key: "ArrowLeft", expected: "move_left" },
      { key: "ArrowRight", expected: "move_right" },
    ])("should map $key to $expected", ({ key, expected }) => {
      const adapter = createKeyboardAdapter({ preventDefault: false });
      cleanup = adapter.start(handler);

      window.dispatchEvent(new KeyboardEvent("keydown", { key }));

      expect(handler).toHaveBeenCalledWith({ type: expected });
    });
  });

  describe("WASD keys", () => {
    it.each([
      { key: "w", expected: "move_up" },
      { key: "s", expected: "move_down" },
      { key: "a", expected: "move_left" },
      { key: "d", expected: "move_right" },
    ])("should map $key to $expected", ({ key, expected }) => {
      const adapter = createKeyboardAdapter({ preventDefault: false });
      cleanup = adapter.start(handler);

      window.dispatchEvent(new KeyboardEvent("keydown", { key }));

      expect(handler).toHaveBeenCalledWith({ type: expected });
    });
  });

  describe("unknown keys", () => {
    it("should not trigger handler for unknown keys", () => {
      const adapter = createKeyboardAdapter({ preventDefault: false });
      cleanup = adapter.start(handler);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should remove event listener on cleanup", () => {
      const adapter = createKeyboardAdapter({ preventDefault: false });
      cleanup = adapter.start(handler);
      cleanup();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});