import { flattenDeep, isEqual } from "lodash";
import { uid } from "uid";
import { tileCountPerDimension } from "@/constants";
import { Tile, TileMap } from "@/models/tile";

type BoardCell = string | undefined;
type Board = BoardCell[][];
type ExistingTile = Tile & { id: string };

export type GameStatus = "ongoing" | "won" | "lost";

export type GameSnapshot = {
  board: Board;
  tiles: TileMap;
  tilesByIds: string[];
  score: number;
  status: GameStatus;
};

export type State = GameSnapshot & {
  hasChanged: boolean;
  history: GameSnapshot[];
  historyIndex: number;
};

export type Action =
  | { type: "clean_up" }
  | { type: "create_tile"; tile: Omit<Tile, "id"> }
  | { type: "jump_to_history"; index: number }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game" }
  | { type: "start_game"; tiles: Omit<Tile, "id">[] }
  | { type: "update_status"; status: GameStatus };

const historyLimit = 50;

function createBoard() {
  const board: Board = [];

  for (let i = 0; i < tileCountPerDimension; i += 1) {
    board[i] = new Array(tileCountPerDimension).fill(undefined);
  }

  return board;
}

function cloneBoard(board: Board) {
  return board.map((row) => [...row]);
}

function cloneTiles(tiles: TileMap) {
  return Object.entries(tiles).reduce<TileMap>((result, [tileId, tile]) => {
    result[tileId] = {
      ...tile,
      position: [...tile.position] as [number, number],
    };

    return result;
  }, {});
}

function createSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    board: cloneBoard(snapshot.board),
    tiles: cloneTiles(snapshot.tiles),
    tilesByIds: [...snapshot.tilesByIds],
    score: snapshot.score,
    status: snapshot.status,
  };
}

function getEmptySnapshot(): GameSnapshot {
  return {
    board: createBoard(),
    tiles: {},
    tilesByIds: [],
    score: 0,
    status: "ongoing",
  };
}

function snapshotFromState(state: GameSnapshot): GameSnapshot {
  return createSnapshot({
    board: state.board,
    tiles: state.tiles,
    tilesByIds: state.tilesByIds,
    score: state.score,
    status: state.status,
  });
}

function pushHistory(state: State, snapshot: GameSnapshot): State {
  const nextSnapshot = createSnapshot(snapshot);
  const history = [...state.history.slice(0, state.historyIndex + 1), nextSnapshot].slice(
    -historyLimit,
  );

  return {
    ...state,
    ...nextSnapshot,
    hasChanged: false,
    history,
    historyIndex: history.length - 1,
  };
}

function replaceCurrentHistoryEntry(state: State, snapshot: GameSnapshot): State {
  const nextSnapshot = createSnapshot(snapshot);
  const history = state.history.map((historySnapshot, index) =>
    index === state.historyIndex ? nextSnapshot : historySnapshot,
  );

  return {
    ...state,
    ...nextSnapshot,
    hasChanged: false,
    history,
    historyIndex: state.historyIndex,
  };
}

function placeTile(snapshot: GameSnapshot, tile: Omit<Tile, "id">): GameSnapshot {
  const tileId = uid();
  const [x, y] = tile.position;
  const nextBoard = cloneBoard(snapshot.board);
  nextBoard[y][x] = tileId;

  return {
    ...snapshot,
    board: nextBoard,
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

export function getInitialState(): State {
  const snapshot = getEmptySnapshot();

  return {
    ...snapshot,
    hasChanged: false,
    history: [createSnapshot(snapshot)],
    historyIndex: 0,
  };
}

export const initialState: State = getInitialState();

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  switch (action.type) {
    case "clean_up": {
      const flattenBoard = flattenDeep(state.board) as BoardCell[];
      const newTiles = flattenBoard.reduce<TileMap>(
        (result: TileMap, tileId: BoardCell) => {
          if (typeof tileId === "undefined") {
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
      const nextSnapshot = placeTile(snapshotFromState(state), action.tile);

      return pushHistory(state, nextSnapshot);
    }
    case "jump_to_history": {
      const snapshot = state.history[action.index];

      if (typeof snapshot === "undefined") {
        return state;
      }

      return {
        ...state,
        ...createSnapshot(snapshot),
        hasChanged: false,
        historyIndex: action.index,
      };
    }
    case "move_up": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < tileCountPerDimension; x++) {
        let newY = 0;
        let previousTile: ExistingTile | undefined;

        for (let y = 0; y < tileCountPerDimension; y++) {
          const tileId = state.board[y][x];

          if (typeof tileId === "undefined") {
            continue;
          }

          const currentTile = state.tiles[tileId] as ExistingTile;

          if (previousTile && previousTile.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id] = {
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
          previousTile = newTiles[tileId] as ExistingTile;
          if (!isEqual(currentTile.position, [x, newY])) {
            hasChanged = true;
          }
          newY++;
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
        let previousTile: ExistingTile | undefined;

        for (let y = tileCountPerDimension - 1; y >= 0; y--) {
          const tileId = state.board[y][x];

          if (typeof tileId === "undefined") {
            continue;
          }

          const currentTile = state.tiles[tileId] as ExistingTile;

          if (previousTile && previousTile.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id] = {
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
          previousTile = newTiles[tileId] as ExistingTile;
          if (!isEqual(currentTile.position, [x, newY])) {
            hasChanged = true;
          }
          newY--;
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
        let previousTile: ExistingTile | undefined;

        for (let x = 0; x < tileCountPerDimension; x++) {
          const tileId = state.board[y][x];

          if (typeof tileId === "undefined") {
            continue;
          }

          const currentTile = state.tiles[tileId] as ExistingTile;

          if (previousTile && previousTile.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id] = {
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
          previousTile = newTiles[tileId] as ExistingTile;
          if (!isEqual(currentTile.position, [newX, y])) {
            hasChanged = true;
          }
          newX++;
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
        let previousTile: ExistingTile | undefined;

        for (let x = tileCountPerDimension - 1; x >= 0; x--) {
          const tileId = state.board[y][x];

          if (typeof tileId === "undefined") {
            continue;
          }

          const currentTile = state.tiles[tileId] as ExistingTile;

          if (previousTile && previousTile.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id] = {
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
            ...currentTile,
            position: [newX, y],
          };
          previousTile = newTiles[tileId] as ExistingTile;
          if (!isEqual(currentTile.position, [newX, y])) {
            hasChanged = true;
          }
          newX--;
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
      return getInitialState();
    case "start_game": {
      const emptyState = getInitialState();
      const startedSnapshot = action.tiles.reduce(
        (snapshot, tile) => placeTile(snapshot, tile),
        snapshotFromState(emptyState),
      );

      return {
        ...emptyState,
        ...startedSnapshot,
        history: [snapshotFromState(emptyState), createSnapshot(startedSnapshot)].slice(
          -historyLimit,
        ),
        historyIndex: 1,
      };
    }
    case "update_status": {
      if (state.status === action.status) {
        return state;
      }

      return replaceCurrentHistoryEntry(state, {
        ...snapshotFromState(state),
        status: action.status,
      });
    }
    default:
      return state;
  }
}
