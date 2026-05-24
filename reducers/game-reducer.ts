import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { tileCountPerDimension } from "@/constants";
import { Tile, TileMap } from "@/models/tile";
import { MoveDirection } from "@/challenges/types";

type GameStatus = "ongoing" | "won" | "lost";

export type State = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
};

export type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game" }
  | { type: "update_status"; status: GameStatus }
  | { type: "restore_state"; state: State };

function createBoard() {
  const board: string[][] = [];

  for (let i = 0; i < tileCountPerDimension; i += 1) {
    board[i] = new Array(tileCountPerDimension).fill(undefined);
  }

  return board;
}

export const initialState: State = {
  board: createBoard(),
  tiles: {},
  tilesByIds: [],
  hasChanged: false,
  score: 0,
  status: "ongoing",
};

function processMove(
  state: State,
  direction: MoveDirection,
  getStartIndex: (dim: number) => number,
  getNextIndex: (idx: number) => number,
  shouldContinue: (idx: number) => boolean,
  updatePosition: (tile: Tile, newIdx: number, fixedIdx: number) => [number, number],
  isFixedX: boolean
) {
  const newBoard = createBoard();
  const newTiles: TileMap = {};
  let hasChanged = false;
  let { score } = state;
  const dimSize = tileCountPerDimension;

  for (let fixedIdx = 0; fixedIdx < dimSize; fixedIdx++) {
    let newIdx = getStartIndex(dimSize);
    let previousTile: Tile | undefined;

    for (
      let idx = getStartIndex(dimSize);
      shouldContinue(idx);
      idx = getNextIndex(idx)
    ) {
      const x = isFixedX ? fixedIdx : idx;
      const y = isFixedX ? idx : fixedIdx;
      const tileId = state.board[y][x];
      const currentTile = state.tiles[tileId];

      if (!isNil(tileId)) {
        if (currentTile.type === "obstacle") {
          newBoard[y][x] = tileId;
          newTiles[tileId] = { ...currentTile };
          previousTile = undefined;
          continue;
        }

        if (previousTile?.value === currentTile.value && previousTile.type !== "obstacle") {
          score += previousTile.value * 2;
          newTiles[previousTile.id as string] = {
            ...previousTile,
            value: previousTile.value * 2,
            mergedCount: (previousTile.mergedCount || 0) + 1,
          };
          newTiles[tileId] = {
            ...currentTile,
            position: updatePosition(currentTile, newIdx, fixedIdx),
          };
          previousTile = undefined;
          hasChanged = true;
          continue;
        }

        const newPos = updatePosition(currentTile, newIdx, fixedIdx);
        const newX = isFixedX ? fixedIdx : newIdx;
        const newY = isFixedX ? newIdx : fixedIdx;
        newBoard[newY][newX] = tileId;
        newTiles[tileId] = {
          ...currentTile,
          position: newPos,
        };
        previousTile = newTiles[tileId];
        if (!isEqual(currentTile.position, newPos)) {
          hasChanged = true;
        }
        newIdx = getNextIndex(newIdx);
      }
    }
  }

  return {
    ...state,
    board: newBoard,
    tiles: newTiles,
    hasChanged,
    score,
  };
}

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  switch (action.type) {
    case "clean_up": {
      const flattenBoard = flattenDeep(state.board);
      const newTiles: TileMap = flattenBoard.reduce(
        (result, tileId: string) => {
          if (isNil(tileId)) {
            return result;
          }

          return {
            ...result,
            [tileId]: state.tiles[tileId],
          };
        },
        {},
      );

      return {
        ...state,
        tiles: newTiles,
        tilesByIds: Object.keys(newTiles),
        hasChanged: false,
      };
    }
    case "create_tile": {
      const tileId = uid();
      const [x, y] = action.tile.position;
      const newBoard = JSON.parse(JSON.stringify(state.board));
      newBoard[y][x] = tileId;

      return {
        ...state,
        board: newBoard,
        tiles: {
          ...state.tiles,
          [tileId]: {
            id: tileId,
            type: "normal",
            mergedCount: 0,
            ...action.tile,
          },
        },
        tilesByIds: [...state.tilesByIds, tileId],
      };
    }
    case "move_up": {
      return processMove(
        state,
        "move_up",
        () => 0,
        (idx) => idx + 1,
        (idx) => idx < tileCountPerDimension,
        (tile, newIdx, fixedIdx) => [fixedIdx, newIdx],
        true
      );
    }
    case "move_down": {
      return processMove(
        state,
        "move_down",
        (dim) => dim - 1,
        (idx) => idx - 1,
        (idx) => idx >= 0,
        (tile, newIdx, fixedIdx) => [fixedIdx, newIdx],
        true
      );
    }
    case "move_left": {
      return processMove(
        state,
        "move_left",
        () => 0,
        (idx) => idx + 1,
        (idx) => idx < tileCountPerDimension,
        (tile, newIdx, fixedIdx) => [newIdx, fixedIdx],
        false
      );
    }
    case "move_right": {
      return processMove(
        state,
        "move_right",
        (dim) => dim - 1,
        (idx) => idx - 1,
        (idx) => idx >= 0,
        (tile, newIdx, fixedIdx) => [newIdx, fixedIdx],
        false
      );
    }
    case "reset_game":
      return initialState;
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    case "restore_state":
      return action.state;
    default:
      return state;
  }
}
