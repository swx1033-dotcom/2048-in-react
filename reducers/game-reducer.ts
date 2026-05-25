import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { tileCountPerDimension } from "@/constants";
import { Tile, TileMap } from "@/models/tile";

type GameStatus = "idle" | "ongoing" | "won" | "lost";

export type State = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
  mode: "normal" | "competition";
  timeoutCount: number;
  totalThinkTime: number;
  moveCount: number;
};
export type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up"; thinkTime?: number }
  | { type: "move_down"; thinkTime?: number }
  | { type: "move_left"; thinkTime?: number }
  | { type: "move_right"; thinkTime?: number }
  | { type: "random_move" }
  | { type: "reset_game"; mode?: "normal" | "competition" }
  | { type: "update_status"; status: GameStatus };

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
  status: "idle",
  mode: "normal",
  timeoutCount: 0,
  totalThinkTime: 0,
  moveCount: 0,
};

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  switch (action.type) {
    case "clean_up": {
      const flattenBoard = flattenDeep(state.board);
      const newTiles: TileMap = flattenBoard.reduce(
        (result: TileMap, tileId: string) => {
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
            ...action.tile,
          },
        },
        tilesByIds: [...state.tilesByIds, tileId],
      };
    }
    case "move_up": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < tileCountPerDimension; x++) {
        let newY = 0;
        let previousTile: Tile | undefined;

        for (let y = 0; y < tileCountPerDimension; y++) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value) {
              score += previousTile.value * 2;
              newTiles[previousTile.id as string] = {
                ...previousTile,
                value: previousTile.value * 2,
              };
              newTiles[tileId] = {
                ...currentTile,
                position: [x, newY - 1],
              };
              previousTile = undefined;
              hasChanged = true;
              continue;
            }

            newBoard[newY][x] = tileId;
            newTiles[tileId] = {
              ...currentTile,
              position: [x, newY],
            };
            previousTile = newTiles[tileId];
            if (!isEqual(currentTile.position, [x, newY])) {
              hasChanged = true;
            }
            newY++;
          }
        }
      }
      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
        totalThinkTime: state.totalThinkTime + (hasChanged ? (action.thinkTime || 0) : 0),
        moveCount: state.moveCount + (hasChanged ? 1 : 0),
      };
    }
    case "move_down": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < tileCountPerDimension; x++) {
        let newY = tileCountPerDimension - 1;
        let previousTile: Tile | undefined;

        for (let y = tileCountPerDimension - 1; y >= 0; y--) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value) {
              score += previousTile.value * 2;
              newTiles[previousTile.id as string] = {
                ...previousTile,
                value: previousTile.value * 2,
              };
              newTiles[tileId] = {
                ...currentTile,
                position: [x, newY + 1],
              };
              previousTile = undefined;
              hasChanged = true;
              continue;
            }

            newBoard[newY][x] = tileId;
            newTiles[tileId] = {
              ...currentTile,
              position: [x, newY],
            };
            previousTile = newTiles[tileId];
            if (!isEqual(currentTile.position, [x, newY])) {
              hasChanged = true;
            }
            newY--;
          }
        }
      }
      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
        totalThinkTime: state.totalThinkTime + (hasChanged ? (action.thinkTime || 0) : 0),
        moveCount: state.moveCount + (hasChanged ? 1 : 0),
      };
    }
    case "move_left": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < tileCountPerDimension; y++) {
        let newX = 0;
        let previousTile: Tile | undefined;

        for (let x = 0; x < tileCountPerDimension; x++) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value) {
              score += previousTile.value * 2;
              newTiles[previousTile.id as string] = {
                ...previousTile,
                value: previousTile.value * 2,
              };
              newTiles[tileId] = {
                ...currentTile,
                position: [newX - 1, y],
              };
              previousTile = undefined;
              hasChanged = true;
              continue;
            }

            newBoard[y][newX] = tileId;
            newTiles[tileId] = {
              ...currentTile,
              position: [newX, y],
            };
            previousTile = newTiles[tileId];
            if (!isEqual(currentTile.position, [newX, y])) {
              hasChanged = true;
            }
            newX++;
          }
        }
      }
      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
        totalThinkTime: state.totalThinkTime + (hasChanged ? (action.thinkTime || 0) : 0),
        moveCount: state.moveCount + (hasChanged ? 1 : 0),
      };
    }
    case "move_right": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < tileCountPerDimension; y++) {
        let newX = tileCountPerDimension - 1;
        let previousTile: Tile | undefined;

        for (let x = tileCountPerDimension - 1; x >= 0; x--) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value) {
              score += previousTile.value * 2;
              newTiles[previousTile.id as string] = {
                ...previousTile,
                value: previousTile.value * 2,
              };
              newTiles[tileId] = {
                ...currentTile,
                position: [newX + 1, y],
              };
              previousTile = undefined;
              hasChanged = true;
              continue;
            }

            newBoard[y][newX] = tileId;
            newTiles[tileId] = {
              ...state.tiles[tileId],
              position: [newX, y],
            };
            previousTile = newTiles[tileId];
            if (!isEqual(currentTile.position, [newX, y])) {
              hasChanged = true;
            }
            newX--;
          }
        }
      }
      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
        totalThinkTime: state.totalThinkTime + (hasChanged ? (action.thinkTime || 0) : 0),
        moveCount: state.moveCount + (hasChanged ? 1 : 0),
      };
    }
    case "reset_game":
      return {
        ...initialState,
        mode: action.mode || state.mode,
        status: "ongoing" as GameStatus,
      };
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    case "random_move": {
      const directions: Action["type"][] = ["move_up", "move_down", "move_left", "move_right"];
      const shuffled = directions.sort(() => Math.random() - 0.5);
      for (const dir of shuffled) {
        // We know it's a move action
        const newState: State = gameReducer(state, { type: dir } as Action);
        if (newState.hasChanged) {
          return {
            ...newState,
            timeoutCount: state.timeoutCount + 1,
          };
        }
      }
      return state;
    }
    default:
      return state;
  }
}
