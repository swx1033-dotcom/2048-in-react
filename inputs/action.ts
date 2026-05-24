export type GameAction =
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" };

export function createMoveAction(direction: string): GameAction | null {
  switch (direction) {
    case "move_up":
    case "ArrowUp":
      return { type: "move_up" };
    case "move_down":
    case "ArrowDown":
      return { type: "move_down" };
    case "move_left":
    case "ArrowLeft":
      return { type: "move_left" };
    case "move_right":
    case "ArrowRight":
      return { type: "move_right" };
    default:
      return null;
  }
}