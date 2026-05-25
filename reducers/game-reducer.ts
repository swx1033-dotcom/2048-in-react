import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { tileCountPerDimension } from "@/constants";
import { Tile, TileMap } from "@/models/tile";

type GameStatus = "ongoing" | "won" | "lost";

type State = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
  isTournamentMode: boolean;
  timeoutCount: number;
  moveCount: number;
  totalThinkingTime: number;
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
  | { type: "set_tournament_mode"; isTournamentMode: boolean }
  | { type: "increment_timeout_count" }
  | { type: "record_thinking_time"; thinkingTime: number };

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
  isTournamentMode: false,
  timeoutCount: 0,
  moveCount: 0,
  totalThinkingTime: 0,
};

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
            ...action.tile,
          },
        },
        tilesByIds: [...state.tilesByIds, tileId],
      };
    }
    case "move_up":
    case "move_down":
    case "move_left":
    case "move_right": {
      const direction = action.type;
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      if (direction === "move_up") {
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
      } else if (direction === "move_down") {
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
      } else if (direction === "move_left") {
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
      } else if (direction === "move_right") {
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
      }

      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
        moveCount: state.moveCount + 1,
      };
    }
    case "reset_game":
      return {
        ...initialState,
        isTournamentMode: state.isTournamentMode,
      };
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    case "set_tournament_mode":
      return {
        ...state,
        isTournamentMode: action.isTournamentMode,
      };
    case "increment_timeout_count":
      return {
        ...state,
        timeoutCount: state.timeoutCount + 1,
      };
    case "record_thinking_time":
      return {
        ...state,
        totalThinkingTime: state.totalThinkingTime + action.thinkingTime,
      };
    default:
      return state;
  }
}
