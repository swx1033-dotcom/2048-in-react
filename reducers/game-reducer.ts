import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { defaultBoardSize } from "@/constants";
import { Tile, TileMap } from "@/models/tile";

type GameStatus = "ongoing" | "won" | "lost";

type State = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
  boardSize: number;
};
type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game" }
  | { type: "update_status"; status: GameStatus }
  | { type: "expand_board"; newSize: number; obstacleTiles: [number, number][] };

function createBoard(size: number) {
  const board: string[][] = [];

  for (let i = 0; i < size; i += 1) {
    board[i] = new Array(size).fill(undefined);
  }

  return board;
}

export const initialState: State = {
  board: createBoard(defaultBoardSize),
  tiles: {},
  tilesByIds: [],
  hasChanged: false,
  score: 0,
  status: "ongoing",
  boardSize: defaultBoardSize,
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
      const newBoard = state.board.map((row) => [...row]);
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
      const { boardSize } = state;
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < boardSize; x++) {
        let newY = 0;
        let previousTile: Tile | undefined;

        for (let y = 0; y < boardSize; y++) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (
              !currentTile.isObstacle &&
              previousTile?.value === currentTile.value &&
              !previousTile.isObstacle
            ) {
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
      const { boardSize } = state;
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < boardSize; x++) {
        let newY = boardSize - 1;
        let previousTile: Tile | undefined;

        for (let y = boardSize - 1; y >= 0; y--) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (
              !currentTile.isObstacle &&
              previousTile?.value === currentTile.value &&
              !previousTile.isObstacle
            ) {
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
      const { boardSize } = state;
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < boardSize; y++) {
        let newX = 0;
        let previousTile: Tile | undefined;

        for (let x = 0; x < boardSize; x++) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (
              !currentTile.isObstacle &&
              previousTile?.value === currentTile.value &&
              !previousTile.isObstacle
            ) {
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
      const { boardSize } = state;
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < boardSize; y++) {
        let newX = boardSize - 1;
        let previousTile: Tile | undefined;

        for (let x = boardSize - 1; x >= 0; x--) {
          const tileId = state.board[y][x];
          const currentTile = state.tiles[tileId];

          if (!isNil(tileId)) {
            if (
              !currentTile.isObstacle &&
              previousTile?.value === currentTile.value &&
              !previousTile.isObstacle
            ) {
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
    case "reset_game":
      return initialState;
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    case "expand_board": {
      const { newSize, obstacleTiles } = action;
      const newBoard = createBoard(newSize);

      for (let y = 0; y < state.boardSize; y++) {
        for (let x = 0; x < state.boardSize; x++) {
          newBoard[y][x] = state.board[y][x];
        }
      }

      const newTiles = { ...state.tiles };
      const obstacleTileIds: string[] = [];

      for (const [ox, oy] of obstacleTiles) {
        const tileId = uid();
        newBoard[oy][ox] = tileId;
        newTiles[tileId] = {
          id: tileId,
          position: [ox, oy],
          value: 1,
          isObstacle: true,
        };
        obstacleTileIds.push(tileId);
      }

      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        tilesByIds: [...state.tilesByIds, ...obstacleTileIds],
        boardSize: newSize,
      };
    }
    default:
      return state;
  }
}
