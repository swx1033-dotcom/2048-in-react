import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { defaultTileCountPerDimension } from "@/constants";
import { Tile, TileMap } from "@/models/tile";

type GameStatus = "ongoing" | "won" | "lost";

export type State = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
  boardSize: number;
  infiniteMode: boolean;
};

type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game"; boardSize?: number; infiniteMode?: boolean }
  | { type: "update_status"; status: GameStatus }
  | { type: "expand_board" }
  | { type: "load_state"; state: State };

function createBoard(size: number) {
  const board: string[][] = [];

  for (let i = 0; i < size; i += 1) {
    board[i] = new Array(size).fill(undefined);
  }

  return board;
}

export const initialState: State = {
  board: createBoard(defaultTileCountPerDimension),
  tiles: {},
  tilesByIds: [],
  hasChanged: false,
  score: 0,
  status: "ongoing",
  boardSize: defaultTileCountPerDimension,
  infiniteMode: false,
};

export default function gameReducer(
  state: State = initialState,
  action: Action,
): State {
  switch (action.type) {
    case "load_state":
      return action.state;
    case "expand_board": {
      const newSize = state.boardSize + 2;
      const newBoard = createBoard(newSize);
      const newTiles: TileMap = {};
      
      for (const tileId of state.tilesByIds) {
        const tile = state.tiles[tileId];
        const [x, y] = tile.position;
        const newX = x + 1;
        const newY = y + 1;
        newBoard[newY][newX] = tileId;
        newTiles[tileId] = {
          ...tile,
          position: [newX, newY],
        };
      }
      
      // Add random obstacles
      const emptyCells: [number, number][] = [];
      for (let x = 0; x < newSize; x++) {
        for (let y = 0; y < newSize; y++) {
          if (x === 0 || x === newSize - 1 || y === 0 || y === newSize - 1) {
            emptyCells.push([x, y]);
          }
        }
      }
      
      const numObstacles = newSize - 1;
      const newTilesByIds = [...state.tilesByIds];
      
      for (let i = 0; i < numObstacles; i++) {
        if (emptyCells.length === 0) break;
        const index = Math.floor(Math.random() * emptyCells.length);
        const pos = emptyCells.splice(index, 1)[0];
        const tileId = uid();
        newBoard[pos[1]][pos[0]] = tileId;
        newTiles[tileId] = {
          id: tileId,
          position: pos,
          value: 2,
          isObstacle: true,
        };
        newTilesByIds.push(tileId);
      }
      
      return {
        ...state,
        boardSize: newSize,
        board: newBoard,
        tiles: newTiles,
        tilesByIds: newTilesByIds,
        hasChanged: true,
      };
    }
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
      const newBoard = createBoard(state.boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < state.boardSize; x++) {
        let newY = 0;
        let previousTile: Tile | undefined;

        for (let y = 0; y < state.boardSize; y++) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value && !previousTile.isObstacle && !currentTile.isObstacle) {
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
      };
    }
    case "move_down": {
      const newBoard = createBoard(state.boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < state.boardSize; x++) {
        let newY = state.boardSize - 1;
        let previousTile: Tile | undefined;

        for (let y = state.boardSize - 1; y >= 0; y--) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value && !previousTile.isObstacle && !currentTile.isObstacle) {
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
      };
    }
    case "move_left": {
      const newBoard = createBoard(state.boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < state.boardSize; y++) {
        let newX = 0;
        let previousTile: Tile | undefined;

        for (let x = 0; x < state.boardSize; x++) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value && !previousTile.isObstacle && !currentTile.isObstacle) {
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
      };
    }
    case "move_right": {
      const newBoard = createBoard(state.boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < state.boardSize; y++) {
        let newX = state.boardSize - 1;
        let previousTile: Tile | undefined;

        for (let x = state.boardSize - 1; x >= 0; x--) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (previousTile?.value === currentTile.value && !previousTile.isObstacle && !currentTile.isObstacle) {
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
      };
    }
    case "reset_game": {
      const size = action.boardSize ?? state.boardSize;
      const inf = action.infiniteMode ?? state.infiniteMode;
      return {
        ...initialState,
        board: createBoard(size),
        boardSize: size,
        infiniteMode: inf,
      };
    }
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    default:
      return state;
  }
}
