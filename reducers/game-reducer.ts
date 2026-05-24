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
  history: State[];
  historyIndex: number;
  isPreviewing: boolean;
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
  | { type: "set_preview"; index: number }
  | { type: "go_to_step"; index: number };

function createBoard() {
  const board: string[][] = [];

  for (let i = 0; i < tileCountPerDimension; i += 1) {
    board[i] = new Array(tileCountPerDimension).fill(undefined);
  }

  return board;
}

function createStateSnapshot(state: Omit<State, "history" | "historyIndex" | "isPreviewing">): Omit<State, "history" | "historyIndex" | "isPreviewing"> {
  return {
    board: JSON.parse(JSON.stringify(state.board)),
    tiles: JSON.parse(JSON.stringify(state.tiles)),
    tilesByIds: [...state.tilesByIds],
    hasChanged: state.hasChanged,
    score: state.score,
    status: state.status,
  };
}

export const initialState: State = {
  board: createBoard(),
  tiles: {},
  tilesByIds: [],
  hasChanged: false,
  score: 0,
  status: "ongoing",
  history: [],
  historyIndex: -1,
  isPreviewing: false,
};

const MAX_HISTORY = 50;

function saveToHistory(newState: State, stateWithoutHistory: Omit<State, "history" | "historyIndex" | "isPreviewing">): State {
  const snapshot = createStateSnapshot(stateWithoutHistory);
  const currentHistory = newState.history.slice(0, newState.historyIndex + 1);
  const newHistory = [...currentHistory, snapshot as State];
  
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
    return {
      ...newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }
  
  return {
    ...newState,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  if (state.isPreviewing && 
      !["set_preview", "go_to_step", "reset_game"].includes(action.type)) {
    return state;
  }

  switch (action.type) {
    case "set_preview": {
      const previewIndex = action.index;
      if (previewIndex < 0 || previewIndex >= state.history.length) {
        return state;
      }
      const previewState = state.history[previewIndex];
      return {
        ...state,
        ...previewState,
        isPreviewing: true,
      };
    }

    case "go_to_step": {
      const stepIndex = action.index;
      if (stepIndex < 0 || stepIndex >= state.history.length) {
        return state;
      }
      const targetState = state.history[stepIndex];
      return {
        ...state,
        ...targetState,
        historyIndex: stepIndex,
        isPreviewing: false,
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
        {} as TileMap,
      );

      const newState = {
        ...state,
        tiles: newTiles,
        tilesByIds: Object.keys(newTiles),
        hasChanged: false,
      };

      return saveToHistory(newState, newState);
    }
    case "create_tile": {
      const tileId = uid();
      const [x, y] = action.tile.position;
      const newBoard = JSON.parse(JSON.stringify(state.board));
      newBoard[y][x] = tileId;

      const newState = {
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

      return saveToHistory(newState, newState);
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
      
      const newState = {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
      };

      if (!hasChanged) {
        return newState;
      }

      return newState;
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
      
      const newState = {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
      };

      if (!hasChanged) {
        return newState;
      }

      return newState;
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
      
      const newState = {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
      };

      if (!hasChanged) {
        return newState;
      }

      return newState;
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
      
      const newState = {
        ...state,
        board: newBoard,
        tiles: newTiles,
        hasChanged,
        score,
      };

      if (!hasChanged) {
        return newState;
      }

      return newState;
    }
    case "reset_game":
      return initialState;
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    default:
      return state;
  }
}
