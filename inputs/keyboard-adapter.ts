import { GameAction } from "./action";

export type InputAdapter = {
  start: (handler: (action: GameAction) => void) => () => void;
};

export type KeyboardAdapterOptions = {
  preventDefault?: boolean;
};

export function createKeyboardAdapter(
  options: KeyboardAdapterOptions = {},
): InputAdapter {
  const { preventDefault = true } = options;

  return {
    start(handler) {
      const keyMap: Record<string, string> = {
        ArrowUp: "move_up",
        ArrowDown: "move_down",
        ArrowLeft: "move_left",
        ArrowRight: "move_right",
        w: "move_up",
        s: "move_down",
        a: "move_left",
        d: "move_right",
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        const direction = keyMap[e.key] || keyMap[e.code];
        if (direction) {
          if (preventDefault) {
            e.preventDefault();
          }
          handler({ type: direction as GameAction["type"] });
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    },
  };
}