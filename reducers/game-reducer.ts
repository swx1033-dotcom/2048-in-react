import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { gameWinTileValue, tileCountPerDimension } from "@/constants";
import { Tile, TileMap } from "@/models/tile";

export type GameStatus = "ongoing" | "won" | "lost";

export type State = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
  hasWon: boolean;
};

type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game" }
  | { type: "continue_game" }
  | { type: "update_status"; status: GameStatus };

function createBoard() {
  const board: string[][] = [];

  for (let i = 0; i < tileCountPerDimension; i += 1) {
    board[i] = new Array(tileCountPerDimension).fill(undefined);
  }

  return board;
}

function hasWinningTile(tiles: TileMap) {
  return Object.values(tiles).some((tile) => tile.value >= gameWinTileValue);
}

export function isGameOver(board: string[][], tiles: TileMap) {
  for (let y = 0; y < tileCountPerDimension; y += 1) {
    for (let x = 0; x < tileCountPerDimension; x += 1) {
      const tileId = board[y][x];

      if (isNil(tileId)) {
        return false;
      }

      const currentValue = tiles[tileId].value;

      if (x < tileCountPerDimension - 1) {
        const rightTileId = board[y][x + 1];

        if (!isNil(rightTileId) && tiles[rightTileId].value === currentValue) {
          return false;
        }
      }

      if (y < tileCountPerDimension - 1) {
        const bottomTileId = board[y + 1][x];

        if (!isNil(bottomTileId) && tiles[bottomTileId].value === currentValue) {
          return false;
        }
      }
    }
  }

  return true;
}

function resolveStatus(state: State, nextState: State): State {
  if (!nextState.hasWon && hasWinningTile(nextState.tiles)) {
    return {
      ...nextState,
      status: "won",
      hasWon: true,
    };
  }

  if (state.status === "won") {
    return {
      ...nextState,
      status: "won",
    };
  }

  if (isGameOver(nextState.board, nextState.tiles)) {
    return {
      ...nextState,
      status: "lost",
    };
  }

  return {
    ...nextState,
    status: state.status === "lost" ? "lost" : "ongoing",
  };
}

function moveUp(state: State) {
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

  return resolveStatus(state, {
    ...state,
    board: newBoard,
    tiles: newTiles,
    hasChanged,
    score,
  });
}

function moveDown(state: State) {
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

  return resolveStatus(state, {
    ...state,
    board: newBoard,
    tiles: newTiles,
    hasChanged,
    score,
  });
}

function moveLeft(state: State) {
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

  return resolveStatus(state, {
    ...state,
    board: newBoard,
    tiles: newTiles,
    hasChanged,
    score,
  });
}

function moveRight(state: State) {
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

  return resolveStatus(state, {
    ...state,
    board: newBoard,
    tiles: newTiles,
    hasChanged,
    score,
  });
}

export const initialState: State = {
  board: createBoard(),
  tiles: {},
  tilesByIds: [],
  hasChanged: false,
  score: 0,
  status: "ongoing",
  hasWon: false,
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

      return resolveStatus(state, {
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
      });
    }
    case "move_up": {
      if (state.status !== "ongoing") {
        return state;
      }

      return moveUp(state);
    }
    case "move_down": {
      if (state.status !== "ongoing") {
        return state;
      }

      return moveDown(state);
    }
    case "move_left": {
      if (state.status !== "ongoing") {
        return state;
      }

      return moveLeft(state);
    }
    case "move_right": {
      if (state.status !== "ongoing") {
        return state;
      }

      return moveRight(state);
    }
    case "reset_game":
      return initialState;
    case "continue_game":
      return {
        ...state,
        status: "ongoing",
      };
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    default:
      return state;
  }
}
