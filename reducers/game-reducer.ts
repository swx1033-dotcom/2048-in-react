import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { defaultBoardSize, maxObstacleCount } from "@/constants";
import { GameMode, Tile, TileMap } from "@/models/tile";

type GameStatus = "ongoing" | "won" | "lost";

type State = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
  boardSize: number;
  mode: GameMode;
};

type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game"; boardSize?: number; mode?: GameMode }
  | { type: "update_status"; status: GameStatus }
  | { type: "expand_board" };

function createBoard(boardSize: number) {
  const board: string[][] = [];

  for (let i = 0; i < boardSize; i += 1) {
    board[i] = new Array(boardSize).fill(undefined);
  }

  return board;
}

function moveTilesInDirection(
  state: State,
  direction: "up" | "down" | "left" | "right",
) {
  const size = state.boardSize;
  const newBoard = createBoard(size);
  const newTiles: TileMap = {};
  let hasChanged = false;
  let { score } = state;

  const isVertical = direction === "up" || direction === "down";
  const isReversed = direction === "down" || direction === "right";

  for (let outer = 0; outer < size; outer++) {
    let newPos = isReversed ? size - 1 : 0;
    let previousTile: Tile | undefined;

    const innerStart = isReversed ? size - 1 : 0;
    const innerEnd = isReversed ? -1 : size;
    const innerStep = isReversed ? -1 : 1;

    for (let inner = innerStart; inner !== innerEnd; inner += innerStep) {
      const boardX = isVertical ? outer : inner;
      const boardY = isVertical ? inner : outer;
      const tileId = state.board[boardY][boardX];
      const currentTile = state.tiles[tileId];

      if (isNil(tileId)) {
        continue;
      }

      const newBoardX = isVertical ? outer : newPos;
      const newBoardY = isVertical ? newPos : outer;

      if (currentTile.isObstacle) {
        newBoard[newBoardY][newBoardX] = tileId;
        newTiles[tileId] = {
          ...currentTile,
          position: [newBoardX, newBoardY],
        };
        if (!isEqual(currentTile.position, [newBoardX, newBoardY])) {
          hasChanged = true;
        }
        newPos += isReversed ? -1 : 1;
        previousTile = undefined;
        continue;
      }

      if (
        previousTile &&
        !previousTile.isObstacle &&
        previousTile.value === currentTile.value
      ) {
        score += previousTile.value * 2;
        newTiles[previousTile.id as string] = {
          ...previousTile,
          value: previousTile.value * 2,
        };
        newTiles[tileId] = {
          ...currentTile,
          position: isVertical
            ? [outer, newPos + (isReversed ? 1 : -1)]
            : [newPos + (isReversed ? 1 : -1), outer],
        };
        previousTile = undefined;
        hasChanged = true;
        continue;
      }

      newBoard[newBoardY][newBoardX] = tileId;
      newTiles[tileId] = {
        ...currentTile,
        position: [newBoardX, newBoardY],
      };
      previousTile = newTiles[tileId];
      if (!isEqual(currentTile.position, [newBoardX, newBoardY])) {
        hasChanged = true;
      }
      newPos += isReversed ? -1 : 1;
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

export const initialState: State = {
  board: createBoard(defaultBoardSize),
  tiles: {},
  tilesByIds: [],
  hasChanged: false,
  score: 0,
  status: "ongoing",
  boardSize: defaultBoardSize,
  mode: "classic",
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
      return moveTilesInDirection(state, "up");
    case "move_down":
      return moveTilesInDirection(state, "down");
    case "move_left":
      return moveTilesInDirection(state, "left");
    case "move_right":
      return moveTilesInDirection(state, "right");
    case "reset_game": {
      const boardSize = action.boardSize ?? state.boardSize;
      const mode = action.mode ?? state.mode;
      return {
        ...initialState,
        boardSize,
        mode,
        board: createBoard(boardSize),
      };
    }
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    case "expand_board": {
      const oldSize = state.boardSize;
      const newSize = oldSize + 2;
      const newBoard = createBoard(newSize);
      const newTiles: TileMap = {};

      for (const tileId of state.tilesByIds) {
        const tile = state.tiles[tileId];
        const [x, y] = tile.position;
        newBoard[y][x] = tileId;
        newTiles[tileId] = { ...tile };
      }

      const obstaclePositions: [number, number][] = [];
      const existingPositions = new Set(
        state.tilesByIds.map((id) => {
          const t = state.tiles[id];
          return `${t.position[0]},${t.position[1]}`;
        }),
      );

      for (let y = 0; y < newSize; y++) {
        for (let x = 0; x < newSize; x++) {
          if (x < oldSize && y < oldSize) continue;
          if (existingPositions.has(`${x},${y}`)) continue;
          obstaclePositions.push([x, y]);
        }
      }

      const obstacleCount = Math.min(
        maxObstacleCount,
        obstaclePositions.length,
      );
      for (let i = 0; i < obstacleCount; i++) {
        const randomIndex = Math.floor(Math.random() * obstaclePositions.length);
        const [ox, oy] = obstaclePositions.splice(randomIndex, 1)[0];
        const obstacleId = uid();
        newBoard[oy][ox] = obstacleId;
        newTiles[obstacleId] = {
          id: obstacleId,
          position: [ox, oy],
          value: 0,
          isObstacle: true,
        };
      }

      return {
        ...state,
        board: newBoard,
        tiles: newTiles,
        tilesByIds: Object.keys(newTiles),
        boardSize: newSize,
        hasChanged: false,
      };
    }
    default:
      return state;
  }
}