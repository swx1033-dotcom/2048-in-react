import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { gameWinTileValue, tileCountPerDimension } from "@/constants";
import { Tile, TileMap } from "@/models/tile";

type GameStatus = "ongoing" | "won" | "lost";

type Snapshot = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  score: number;
  status: GameStatus;
};

type State = Snapshot & {
  hasChanged: boolean;
  history: Snapshot[];
};

type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "finalize_move" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game" }
  | { type: "start_game" }
  | { type: "undo" }
  | { type: "update_status"; status: GameStatus };

function createBoard() {
  const board: string[][] = [];

  for (let i = 0; i < tileCountPerDimension; i += 1) {
    board[i] = new Array(tileCountPerDimension).fill(undefined);
  }

  return board;
}

function cloneBoard(board: string[][]) {
  return board.map((row) => [...row]);
}

function cloneTiles(tiles: TileMap) {
  return Object.values(tiles).reduce<TileMap>(
    (result, tile) => ({
      ...result,
      [tile.id as string]: {
        ...tile,
        position: [...tile.position] as [number, number],
      },
    }),
    {},
  );
}

function createSnapshot({ board, tiles, tilesByIds, score, status }: Snapshot): Snapshot {
  return {
    board: cloneBoard(board),
    tiles: cloneTiles(tiles),
    tilesByIds: [...tilesByIds],
    score,
    status,
  };
}

function restoreSnapshot(snapshot: Snapshot, history: Snapshot[]): State {
  const restoredSnapshot = createSnapshot(snapshot);

  return {
    ...restoredSnapshot,
    hasChanged: false,
    history,
  };
}

function appendTile(snapshot: Snapshot, tile: Tile): Snapshot {
  const tileId = uid();
  const [x, y] = tile.position;
  const board = cloneBoard(snapshot.board);
  board[y][x] = tileId;

  return {
    ...snapshot,
    board,
    tiles: {
      ...snapshot.tiles,
      [tileId]: {
        id: tileId,
        ...tile,
      },
    },
    tilesByIds: [...snapshot.tilesByIds, tileId],
  };
}

function getEmptyCells(board: string[][]) {
  const results: [number, number][] = [];

  for (let x = 0; x < tileCountPerDimension; x += 1) {
    for (let y = 0; y < tileCountPerDimension; y += 1) {
      if (isNil(board[y][x])) {
        results.push([x, y]);
      }
    }
  }

  return results;
}

function getStatus(board: string[][], tiles: TileMap): GameStatus {
  if (Object.values(tiles).some((tile) => tile.value === gameWinTileValue)) {
    return "won";
  }

  let hasEmptyCells = false;

  for (let y = 0; y < tileCountPerDimension; y += 1) {
    for (let x = 0; x < tileCountPerDimension; x += 1) {
      const tileId = board[y][x];

      if (isNil(tileId)) {
        hasEmptyCells = true;
        continue;
      }

      const rightTileId = x < tileCountPerDimension - 1 ? board[y][x + 1] : undefined;
      const bottomTileId =
        y < tileCountPerDimension - 1 ? board[y + 1][x] : undefined;

      if (
        typeof rightTileId === "string" &&
        tiles[rightTileId].value === tiles[tileId].value
      ) {
        return "ongoing";
      }

      if (
        typeof bottomTileId === "string" &&
        tiles[bottomTileId].value === tiles[tileId].value
      ) {
        return "ongoing";
      }
    }
  }

  return hasEmptyCells ? "ongoing" : "lost";
}

function cleanUpBoard(state: State): Snapshot {
  const flattenBoard = flattenDeep(state.board) as Array<string | undefined>;
  const tiles = flattenBoard.reduce<TileMap>(
    (result: TileMap, tileId: string | undefined) => {
      if (typeof tileId !== "string") {
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
    board: cloneBoard(state.board),
    tiles,
    tilesByIds: Object.keys(tiles),
    score: state.score,
    status: state.status,
  };
}

function createStartedState(): State {
  const startedState = appendTile(
    appendTile(
      {
        board: createBoard(),
        tiles: {},
        tilesByIds: [],
        score: 0,
        status: "ongoing",
      },
      { position: [0, 1], value: 2 },
    ),
    { position: [0, 2], value: 2 },
  );
  const snapshot = createSnapshot(startedState);

  return {
    ...snapshot,
    hasChanged: false,
    history: [snapshot],
  };
}

const emptySnapshot: Snapshot = {
  board: createBoard(),
  tiles: {},
  tilesByIds: [],
  score: 0,
  status: "ongoing",
};

const initialSnapshot = createSnapshot(emptySnapshot);

export const initialState: State = {
  ...initialSnapshot,
  hasChanged: false,
  history: [initialSnapshot],
};

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  switch (action.type) {
    case "clean_up": {
      const cleanedState = cleanUpBoard(state);

      return {
        ...state,
        ...cleanedState,
        hasChanged: false,
      };
    }
    case "create_tile": {
      const nextState = appendTile(state, action.tile);

      return {
        ...state,
        ...nextState,
      };
    }
    case "finalize_move": {
      const cleanedState = cleanUpBoard(state);
      const emptyCells = getEmptyCells(cleanedState.board);
      const stateWithNewTile =
        emptyCells.length > 0
          ? appendTile(cleanedState, {
              position:
                emptyCells[Math.floor(Math.random() * emptyCells.length)],
              value: 2,
            })
          : cleanedState;
      const status = getStatus(stateWithNewTile.board, stateWithNewTile.tiles);
      const snapshot = createSnapshot({
        ...stateWithNewTile,
        status,
      });

      return {
        ...snapshot,
        hasChanged: false,
        history: [...state.history, snapshot],
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
      };
    }
    case "reset_game":
      return initialState;
    case "start_game":
      return createStartedState();
    case "undo": {
      if (state.hasChanged) {
        return restoreSnapshot(
          state.history[state.history.length - 1],
          [...state.history],
        );
      }

      if (state.history.length <= 1) {
        return state;
      }

      const history = state.history.slice(0, -1);

      return restoreSnapshot(history[history.length - 1], history);
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
