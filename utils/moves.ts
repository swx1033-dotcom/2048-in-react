import { isNil } from "lodash";
import { TileMap } from "@/models/tile";

export type MoveDirection =
  | "move_up"
  | "move_down"
  | "move_left"
  | "move_right";

export function canMove(
  board: string[][],
  tiles: TileMap,
  direction: MoveDirection,
): boolean {
  const size = board.length;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tileId = board[y][x];
      if (isNil(tileId)) {
        continue;
      }

      switch (direction) {
        case "move_up": {
          if (y === 0) {
            break;
          }

          const aboveId = board[y - 1][x];
          if (isNil(aboveId) || tiles[aboveId]?.value === tiles[tileId]?.value) {
            return true;
          }
          break;
        }
        case "move_down": {
          if (y === size - 1) {
            break;
          }

          const belowId = board[y + 1][x];
          if (isNil(belowId) || tiles[belowId]?.value === tiles[tileId]?.value) {
            return true;
          }
          break;
        }
        case "move_left": {
          if (x === 0) {
            break;
          }

          const leftId = board[y][x - 1];
          if (isNil(leftId) || tiles[leftId]?.value === tiles[tileId]?.value) {
            return true;
          }
          break;
        }
        case "move_right": {
          if (x === size - 1) {
            break;
          }

          const rightId = board[y][x + 1];
          if (isNil(rightId) || tiles[rightId]?.value === tiles[tileId]?.value) {
            return true;
          }
          break;
        }
      }
    }
  }

  return false;
}

export function isGameOver(board: string[][], tiles: TileMap): boolean {
  const isBoardFull = board.every((row) => row.every((cell) => !isNil(cell)));

  if (!isBoardFull) {
    return false;
  }

  const directions: MoveDirection[] = [
    "move_up",
    "move_down",
    "move_left",
    "move_right",
  ];

  return directions.every((direction) => !canMove(board, tiles, direction));
}

export function getRandomMove(
  board: string[][],
  tiles: TileMap,
): MoveDirection | null {
  const directions: MoveDirection[] = [
    "move_up",
    "move_down",
    "move_left",
    "move_right",
  ];

  const legalMoves = directions.filter((dir) => canMove(board, tiles, dir));

  if (legalMoves.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  return legalMoves[randomIndex];
}
