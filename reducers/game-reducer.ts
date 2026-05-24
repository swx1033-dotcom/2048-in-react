import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { MoveDirection, tileCountPerDimension } from "@/constants";
import { Tile, TileMap, isObstacleTile, normalizeTile } from "@/models/tile";

export type GameStatus = "ongoing" | "won" | "lost";

export type MovementRules = {
  maxMergesPerMove?: number;
};

export type State = {
  board: (string | undefined)[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
};

export type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: MoveDirection; rules?: MovementRules }
  | { type: "reset_game" }
  | { type: "update_status"; status: GameStatus };

export function createBoard() {
  const board: (string | undefined)[][] = [];

  for (let i = 0; i < tileCountPerDimension; i += 1) {
    board[i] = new Array(tileCountPerDimension).fill(undefined);
  }

  return board;
}

export function createInitialState(): State {
  return {
    board: createBoard(),
    tiles: {},
    tilesByIds: [],
    hasChanged: false,
    score: 0,
    status: "ongoing",
  };
}

export const initialState: State = createInitialState();

const getMovementRuleLimit = (rules?: MovementRules) => {
  if (typeof rules?.maxMergesPerMove !== "number") {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.floor(rules.maxMergesPerMove));
};

const canMergeTiles = (previousTile?: Tile, currentTile?: Tile) => {
  if (!previousTile || !currentTile) {
    return false;
  }

  if (isObstacleTile(previousTile) || isObstacleTile(currentTile)) {
    return false;
  }

  return previousTile.value === currentTile.value;
};

const buildLineCoordinates = (direction: MoveDirection, index: number) => {
  const line: [number, number][] = [];

  for (let offset = 0; offset < tileCountPerDimension; offset += 1) {
    if (direction === "move_left") {
      line.push([offset, index]);
    }

    if (direction === "move_right") {
      line.push([tileCountPerDimension - 1 - offset, index]);
    }

    if (direction === "move_up") {
      line.push([index, offset]);
    }

    if (direction === "move_down") {
      line.push([index, tileCountPerDimension - 1 - offset]);
    }
  }

  return line;
};

const move = (state: State, direction: MoveDirection, rules?: MovementRules) => {
  const newBoard = createBoard();
  const newTiles: TileMap = {};
  let hasChanged = false;
  let score = state.score;
  let mergesUsed = 0;
  const mergeLimit = getMovementRuleLimit(rules);

  for (let index = 0; index < tileCountPerDimension; index += 1) {
    const line = buildLineCoordinates(direction, index);
    const obstacleIndexes = new Set<number>();

    line.forEach(([x, y], lineIndex) => {
      const tileId = state.board[y][x];

      if (typeof tileId !== "string") {
        return;
      }

      const tile = normalizeTile(state.tiles[tileId]);

      if (!isObstacleTile(tile)) {
        return;
      }

      obstacleIndexes.add(lineIndex);
      newBoard[y][x] = tileId;
      newTiles[tileId] = {
        ...tile,
        position: [x, y],
      };
    });

    let segmentStart = 0;

    while (segmentStart < line.length) {
      while (segmentStart < line.length && obstacleIndexes.has(segmentStart)) {
        segmentStart += 1;
      }

      if (segmentStart >= line.length) {
        break;
      }

      let segmentEnd = segmentStart;
      while (segmentEnd < line.length && !obstacleIndexes.has(segmentEnd)) {
        segmentEnd += 1;
      }

      const segment = line.slice(segmentStart, segmentEnd);
      const placedTileIds: string[] = [];

      segment.forEach(([x, y]) => {
        const tileId = state.board[y][x];

        if (typeof tileId !== "string") {
          return;
        }

        const currentTile = normalizeTile(state.tiles[tileId]);

        if (isObstacleTile(currentTile)) {
          return;
        }

        const previousPlacedTileId = placedTileIds[placedTileIds.length - 1];
        const previousPlacedTile =
          typeof previousPlacedTileId === "string"
            ? newTiles[previousPlacedTileId]
            : undefined;

        if (
          typeof previousPlacedTileId === "string" &&
          previousPlacedTile &&
          canMergeTiles(previousPlacedTile, currentTile) &&
          mergesUsed < mergeLimit
        ) {
          score += previousPlacedTile.value * 2;
          newTiles[previousPlacedTileId] = {
            ...previousPlacedTile,
            value: previousPlacedTile.value * 2,
          };
          newTiles[tileId] = {
            ...currentTile,
            position: previousPlacedTile.position,
          };
          hasChanged = true;
          mergesUsed += 1;
          return;
        }

        const nextPosition = segment[placedTileIds.length];
        newBoard[nextPosition[1]][nextPosition[0]] = tileId;
        newTiles[tileId] = {
          ...currentTile,
          position: nextPosition,
        };

        if (!isEqual(currentTile.position, nextPosition)) {
          hasChanged = true;
        }

        placedTileIds.push(tileId);
      });

      segmentStart = segmentEnd + 1;
    }
  }

  return {
    ...state,
    board: newBoard,
    tiles: newTiles,
    tilesByIds: state.tilesByIds.filter((tileId) => !isNil(newTiles[tileId])),
    hasChanged,
    score,
  };
};

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  switch (action.type) {
    case "clean_up": {
      const flattenBoard = flattenDeep(state.board);
      const newTiles = flattenBoard.reduce<TileMap>(
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
          [tileId]: normalizeTile({
            id: tileId,
            ...action.tile,
          }),
        },
        tilesByIds: [...state.tilesByIds, tileId],
      };
    }
    case "move_up":
    case "move_down":
    case "move_left":
    case "move_right":
      return move(state, action.type, action.rules);
    case "reset_game":
      return createInitialState();
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    default:
      return state;
  }
}
