import { TileMap } from "@/models/tile";
import { isNil } from "lodash";

export type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export function canMove(
  board: string[][],
  tiles: TileMap,
  direction: MoveDirection,
): boolean {
  const size = board.length;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tileId = board[y][x];
      if (isNil(tileId)) continue;

      const tile = tiles[tileId];
      const [tx, ty] = tile.position;

      switch (direction) {
        case "move_up":
          if (ty > 0) {
            const aboveId = board[ty - 1][tx];
            if (isNil(aboveId) || tiles[aboveId]?.value === tile.value) {
              return true;
            }
          }
          break;
        case "move_down":
          if (ty < size - 1) {
            const belowId = board[ty + 1][tx];
            if (isNil(belowId) || tiles[belowId]?.value === tile.value) {
              return true;
            }
          }
          break;
        case "move_left":
          if (tx > 0) {
            const leftId = board[ty][tx - 1];
            if (isNil(leftId) || tiles[leftId]?.value === tile.value) {
              return true;
            }
          }
          break;
        case "move_right":
          if (tx < size - 1) {
            const rightId = board[ty][tx + 1];
            if (isNil(rightId) || tiles[rightId]?.value === tile.value) {
              return true;
            }
          }
          break;
      }
    }
  }

  return false;
}

export function isGameOver(board: string[][], tiles: TileMap): boolean {
  const directions: MoveDirection[] = [
    "move_up",
    "move_down",
    "move_left",
    "move_right",
  ];

  for (const direction of directions) {
    if (canMove(board, tiles, direction)) {
      return false;
    }
  }

  return true;
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