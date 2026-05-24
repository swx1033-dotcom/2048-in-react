import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { defaultTileCountPerDimension, obstacleTileValue } from "@/constants";
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
  isInfiniteMode: boolean;
  previousScore: number;
};

type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game"; boardSize?: number; isInfiniteMode?: boolean }
  | { type: "update_status"; status: GameStatus }
  | { type: "expand_board"; obstacles: Tile[] };

function createBoard(size: number) {
  const board: string[][] = [];

  for (let i = 0; i < size; i += 1) {
    board[i] = new Array(size).fill(undefined);
  }

  return board;
}

function getInitialState(boardSize: number = defaultTileCountPerDimension, isInfiniteMode: boolean = false): State {
  return {
    board: createBoard(boardSize),
    tiles: {},
    tilesByIds: [],
    hasChanged: false,
    score: 0,
    status: "ongoing",
    boardSize,
    isInfiniteMode,
    previousScore: 0,
  };
}

export const initialState: State = getInitialState();

function canMerge(tile1: Tile | undefined, tile2: Tile | undefined): boolean {
  if (isNil(tile1) || isNil(tile2)) return false;
  if (tile1.isObstacle || tile2.isObstacle) return false;
  return tile1.value === tile2.value;
}

function processLine(
  line: (string | undefined)[],
  tiles: TileMap,
  direction: 'forward' | 'backward',
  score: number
): { newLine: (string | undefined)[], newTiles: TileMap, hasChanged: boolean, newScore: number } {
  const newLine: (string | undefined)[] = [];
  const newTiles: TileMap = {};
  let hasChanged = false;
  let newScore = score;
  let previousTileId: string | undefined;

  const processTile = (tileId: string | undefined, index: number, targetIndex: number) => {
    if (isNil(tileId)) return;

    const currentTile = tiles[tileId];
    if (currentTile.isObstacle) {
      newLine[targetIndex] = tileId;
      newTiles[tileId] = { ...currentTile };
      return;
    }

    if (previousTileId && canMerge(tiles[previousTileId], currentTile)) {
      newScore += tiles[previousTileId].value * 2;
      newTiles[previousTileId] = {
        ...tiles[previousTileId],
        value: tiles[previousTileId].value * 2,
      };
      newTiles[tileId] = {
        ...currentTile,
        position: [
          direction === 'forward' ? targetIndex - 1 : (line.length - 1) - (targetIndex - 1),
          currentTile.position[1]
        ],
      };
      previousTileId = undefined;
      hasChanged = true;
    } else {
      newLine[targetIndex] = tileId;
      newTiles[tileId] = { ...currentTile };
      previousTileId = tileId;
    }
  };

  if (direction === 'forward') {
    let targetIndex = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i]) {
        processTile(line[i], i, targetIndex);
        if (newLine[targetIndex]) {
          const tile = newTiles[newLine[targetIndex]!];
          if (tile && !tile.isObstacle) {
            targetIndex++;
          }
        }
      }
    }
  } else {
    let targetIndex = line.length - 1;
    for (let i = line.length - 1; i >= 0; i--) {
      if (line[i]) {
        processTile(line[i], i, targetIndex);
        if (newLine[targetIndex]) {
          const tile = newTiles[newLine[targetIndex]!];
          if (tile && !tile.isObstacle) {
            targetIndex--;
          }
        }
      }
    }
  }

  return { newLine, newTiles, hasChanged, newScore };
}

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  const { boardSize } = state;

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
    case "move_up": {
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < boardSize; x++) {
        const column: (string | undefined)[] = [];
        for (let y = 0; y < boardSize; y++) {
          column[y] = state.board[y][x];
        }
        
        const result = processLine(column, state.tiles, 'forward', score);
        score = result.newScore;
        
        for (let y = 0; y < boardSize; y++) {
          if (result.newLine[y]) {
            newBoard[y][x] = result.newLine[y];
            const tile = result.newTiles[result.newLine[y]!];
            if (tile) {
              newTiles[result.newLine[y]!] = {
                ...tile,
                position: [x, y],
              };
              const originalTile = state.tiles[result.newLine[y]!];
              if (!isEqual(originalTile.position, [x, y])) {
                hasChanged = true;
              }
            }
          }
        }
        
        Object.assign(newTiles, result.newTiles);
        if (result.hasChanged) hasChanged = true;
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
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < boardSize; x++) {
        const column: (string | undefined)[] = [];
        for (let y = 0; y < boardSize; y++) {
          column[y] = state.board[y][x];
        }
        
        const result = processLine(column, state.tiles, 'backward', score);
        score = result.newScore;
        
        for (let y = 0; y < boardSize; y++) {
          if (result.newLine[y]) {
            newBoard[y][x] = result.newLine[y];
            const tile = result.newTiles[result.newLine[y]!];
            if (tile) {
              newTiles[result.newLine[y]!] = {
                ...tile,
                position: [x, y],
              };
              const originalTile = state.tiles[result.newLine[y]!];
              if (!isEqual(originalTile.position, [x, y])) {
                hasChanged = true;
              }
            }
          }
        }
        
        Object.assign(newTiles, result.newTiles);
        if (result.hasChanged) hasChanged = true;
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
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < boardSize; y++) {
        const row = [...state.board[y]];
        const result = processLine(row, state.tiles, 'forward', score);
        score = result.newScore;
        
        for (let x = 0; x < boardSize; x++) {
          if (result.newLine[x]) {
            newBoard[y][x] = result.newLine[x];
            const tile = result.newTiles[result.newLine[x]!];
            if (tile) {
              newTiles[result.newLine[x]!] = {
                ...tile,
                position: [x, y],
              };
              const originalTile = state.tiles[result.newLine[x]!];
              if (!isEqual(originalTile.position, [x, y])) {
                hasChanged = true;
              }
            }
          }
        }
        
        Object.assign(newTiles, result.newTiles);
        if (result.hasChanged) hasChanged = true;
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
      const newBoard = createBoard(boardSize);
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < boardSize; y++) {
        const row = [...state.board[y]];
        const result = processLine(row, state.tiles, 'backward', score);
        score = result.newScore;
        
        for (let x = 0; x < boardSize; x++) {
          if (result.newLine[x]) {
            newBoard[y][x] = result.newLine[x];
            const tile = result.newTiles[result.newLine[x]!];
            if (tile) {
              newTiles[result.newLine[x]!] = {
                ...tile,
                position: [x, y],
              };
              const originalTile = state.tiles[result.newLine[x]!];
              if (!isEqual(originalTile.position, [x, y])) {
                hasChanged = true;
              }
            }
          }
        }
        
        Object.assign(newTiles, result.newTiles);
        if (result.hasChanged) hasChanged = true;
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
      return getInitialState(action.boardSize, action.isInfiniteMode);
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    case "expand_board": {
      const newSize = boardSize + 2;
      const newBoard = createBoard(newSize);
      
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          newBoard[y + 1][x + 1] = state.board[y][x];
        }
      }
      
      const newTiles = { ...state.tiles };
      const newTilesByIds = [...state.tilesByIds];
      
      Object.keys(newTiles).forEach((tileId) => {
        const tile = newTiles[tileId];
        newTiles[tileId] = {
          ...tile,
          position: [tile.position[0] + 1, tile.position[1] + 1],
        };
      });
      
      action.obstacles.forEach((obstacle) => {
        const tileId = uid();
        newBoard[obstacle.position[1]][obstacle.position[0]] = tileId;
        newTiles[tileId] = {
          id: tileId,
          ...obstacle,
          isObstacle: true,
          value: obstacleTileValue,
        };
        newTilesByIds.push(tileId);
      });
      
      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        tilesByIds: newTilesByIds,
        boardSize: newSize,
        previousScore: state.score,
      };
    }
    default:
      return state;
  }
}
