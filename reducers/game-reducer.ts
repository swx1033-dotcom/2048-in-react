import { flattenDeep, isNil } from "lodash";
import { uid } from "uid";
import {
  defaultGameMode,
  infiniteExpansionTileValue,
} from "@/constants";
import { GameMode, Tile, TileKind, TileMap } from "@/models/tile";

export type GameStatus = "ongoing" | "won" | "lost";
export type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";
export type BoardCell = string | undefined;
export type Board = BoardCell[][];

export type ExpansionPlan = {
  obstacleTiles: Tile[];
  nextExpansionValue: number;
};

export type State = {
  board: Board;
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
  dimension: number;
  mode: GameMode;
  nextExpansionValue: number;
};

export type PersistedState = Partial<State> & {
  size?: number;
  version?: number;
};

type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: MoveDirection }
  | { type: "reset_game"; mode?: GameMode }
  | { type: "update_status"; status: GameStatus }
  | { type: "hydrate_state"; state: State }
  | { type: "finalize_turn"; tile?: Tile; expansion?: ExpansionPlan };

type PositionedTile = Tile & {
  id: string;
  kind: TileKind;
};

const moveDirections: MoveDirection[] = [
  "move_up",
  "move_down",
  "move_left",
  "move_right",
];

export function getBoardDimension(mode: GameMode) {
  switch (mode) {
    case "5x5":
      return 5;
    case "6x6":
      return 6;
    case "infinite":
      return 4;
    default:
      return 4;
  }
}

export function createBoard(dimension: number) {
  return Array.from({ length: dimension }, () =>
    new Array<BoardCell>(dimension).fill(undefined),
  );
}

function isGameMode(value: unknown): value is GameMode {
  return value === "4x4" || value === "5x5" || value === "6x6" || value === "infinite";
}

function normalizeTile(tile: Tile): PositionedTile {
  return {
    ...tile,
    id: tile.id ?? uid(),
    kind: tile.kind ?? "number",
  };
}

function cloneBoard(board: Board) {
  return board.map((row) => [...row]);
}

function getTileIdsFromBoard(board: Board) {
  return flattenDeep(board).filter(
    (tileId: BoardCell): tileId is string => !isNil(tileId),
  );
}

function placeTileOnBoard(board: Board, tileId: string, position: [number, number]) {
  const [x, y] = position;
  board[y][x] = tileId;
}

function insertTile(state: State, tile: Tile) {
  const normalizedTile = normalizeTile(tile);
  const newBoard = cloneBoard(state.board);

  placeTileOnBoard(newBoard, normalizedTile.id, normalizedTile.position);

  return {
    ...state,
    board: newBoard,
    tiles: {
      ...state.tiles,
      [normalizedTile.id]: normalizedTile,
    },
    tilesByIds: [...state.tilesByIds, normalizedTile.id],
  };
}

export function createInitialState(mode: GameMode = defaultGameMode): State {
  const dimension = getBoardDimension(mode);

  return {
    board: createBoard(dimension),
    tiles: {},
    tilesByIds: [],
    hasChanged: false,
    score: 0,
    status: "ongoing",
    dimension,
    mode,
    nextExpansionValue: infiniteExpansionTileValue,
  };
}

export const initialState = createInitialState();

export function cleanupState(state: State): State {
  const tileIds = getTileIdsFromBoard(state.board);
  const newTiles: TileMap = tileIds.reduce<TileMap>(
    (result: TileMap, tileId: string) => {
      result[tileId] = normalizeTile(state.tiles[tileId]);
      return result;
    },
    {},
  );

  return {
    ...state,
    tiles: newTiles,
    tilesByIds: tileIds,
    hasChanged: false,
  };
}

function buildMovedState(state: State, direction: MoveDirection) {
  const newBoard = createBoard(state.dimension);
  const newTiles: TileMap = {};
  let hasChanged = false;
  let score = state.score;

  const processLine = (
    line: BoardCell[],
    getCoordinate: (index: number) => [number, number],
  ) => {
    let nextInsertIndex = 0;
    let previousTile: PositionedTile | undefined;

    line.forEach((tileId, index) => {
      if (isNil(tileId)) {
        return;
      }

      const currentTileId = tileId as string;
      const currentTile = normalizeTile(state.tiles[currentTileId]);

      if (currentTile.kind === "obstacle") {
        const obstaclePosition = getCoordinate(index);
        placeTileOnBoard(newBoard, currentTileId, obstaclePosition);
        newTiles[currentTileId] = {
          ...currentTile,
          position: obstaclePosition,
        };

        if (
          currentTile.position[0] !== obstaclePosition[0] ||
          currentTile.position[1] !== obstaclePosition[1]
        ) {
          hasChanged = true;
        }

        nextInsertIndex = index + 1;
        previousTile = undefined;
        return;
      }

      if (
        previousTile &&
        previousTile.kind === "number" &&
        previousTile.value === currentTile.value
      ) {
        const mergedPosition = previousTile.position;
        const mergedValue = previousTile.value * 2;

        score += mergedValue;
        newTiles[previousTile.id] = {
          ...previousTile,
          value: mergedValue,
        };
        newTiles[currentTile.id] = {
          ...currentTile,
          position: mergedPosition,
        };
        previousTile = undefined;
        hasChanged = true;
        return;
      }

      const nextPosition = getCoordinate(nextInsertIndex);
      placeTileOnBoard(newBoard, currentTileId, nextPosition);
      newTiles[currentTileId] = {
        ...currentTile,
        position: nextPosition,
      };

      if (
        currentTile.position[0] !== nextPosition[0] ||
        currentTile.position[1] !== nextPosition[1]
      ) {
        hasChanged = true;
      }

      previousTile = newTiles[currentTileId] as PositionedTile;
      nextInsertIndex += 1;
    });
  };

  if (direction === "move_left") {
    for (let y = 0; y < state.dimension; y += 1) {
      processLine(state.board[y], (index) => [index, y]);
    }
  }

  if (direction === "move_right") {
    for (let y = 0; y < state.dimension; y += 1) {
      const line = [...state.board[y]].reverse();
      processLine(line, (index) => [state.dimension - 1 - index, y]);
    }
  }

  if (direction === "move_up") {
    for (let x = 0; x < state.dimension; x += 1) {
      const line = Array.from({ length: state.dimension }, (_, y) => state.board[y][x]);
      processLine(line, (index) => [x, index]);
    }
  }

  if (direction === "move_down") {
    for (let x = 0; x < state.dimension; x += 1) {
      const line = Array.from(
        { length: state.dimension },
        (_, offset) => state.board[state.dimension - 1 - offset][x],
      );
      processLine(line, (index) => [x, state.dimension - 1 - index]);
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

export function simulateMove(state: State, direction: MoveDirection) {
  return cleanupState(buildMovedState(cleanupState(state), direction));
}

export function canMove(state: State) {
  const cleanedState = cleanupState(state);

  return moveDirections.some(
    (direction) => buildMovedState(cleanedState, direction).hasChanged,
  );
}

export function shouldExpandBoard(state: State) {
  if (state.mode !== "infinite") {
    return false;
  }

  return Object.values(state.tiles).some(
    (tile) => (tile.kind ?? "number") === "number" && tile.value >= state.nextExpansionValue,
  );
}

export function getPerimeterPositions(dimension: number): [number, number][] {
  const positions: [number, number][] = [];

  for (let x = 0; x < dimension; x += 1) {
    positions.push([x, 0]);
    positions.push([x, dimension - 1]);
  }

  for (let y = 1; y < dimension - 1; y += 1) {
    positions.push([0, y]);
    positions.push([dimension - 1, y]);
  }

  return positions;
}

export function buildExpandedPreviewBoard(
  state: State,
  obstaclePositions: [number, number][],
) {
  const newBoard = createBoard(state.dimension + 2);

  state.board.forEach((row, y) => {
    row.forEach((tileId, x) => {
      if (!isNil(tileId)) {
        newBoard[y + 1][x + 1] = tileId;
      }
    });
  });

  obstaclePositions.forEach(([x, y], index) => {
    newBoard[y][x] = `preview-obstacle-${index}`;
  });

  return newBoard;
}

export function expandState(state: State, expansion: ExpansionPlan): State {
  const cleanedState = cleanupState(state);
  const expandedBoard = createBoard(cleanedState.dimension + 2);
  const expandedTiles: TileMap = {};

  cleanedState.tilesByIds.forEach((tileId) => {
    const currentTile = normalizeTile(cleanedState.tiles[tileId]);
    const nextPosition: [number, number] = [
      currentTile.position[0] + 1,
      currentTile.position[1] + 1,
    ];

    placeTileOnBoard(expandedBoard, tileId, nextPosition);
    expandedTiles[tileId] = {
      ...currentTile,
      position: nextPosition,
    };
  });

  let nextState: State = {
    ...cleanedState,
    board: expandedBoard,
    tiles: expandedTiles,
    tilesByIds: getTileIdsFromBoard(expandedBoard),
    dimension: cleanedState.dimension + 2,
    nextExpansionValue: expansion.nextExpansionValue,
  };

  expansion.obstacleTiles.forEach((tile) => {
    nextState = insertTile(nextState, {
      ...tile,
      kind: "obstacle",
      value: 0,
    });
  });

  return nextState;
}

export function migratePersistedState(payload: unknown): State | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const rawState = payload as PersistedState;
  const mode = isGameMode(rawState.mode) ? rawState.mode : defaultGameMode;
  const inferredDimension =
    typeof rawState.dimension === "number"
      ? rawState.dimension
      : typeof rawState.size === "number"
        ? rawState.size
        : Array.isArray(rawState.board)
          ? rawState.board.length
          : getBoardDimension(mode);

  if (inferredDimension <= 0) {
    return null;
  }

  const board = createBoard(inferredDimension);
  const rawBoard = Array.isArray(rawState.board) ? rawState.board : [];

  rawBoard.forEach((row, y) => {
    if (!Array.isArray(row) || y >= inferredDimension) {
      return;
    }

    row.forEach((tileId, x) => {
      if (typeof tileId === "string" && x < inferredDimension) {
        board[y][x] = tileId;
      }
    });
  });

  const tiles: TileMap = {};
  const rawTiles = rawState.tiles ?? {};

  Object.entries(rawTiles).forEach(([tileId, tile]) => {
    if (!tile || typeof tile !== "object") {
      return;
    }

    const rawTile = tile as Tile;
    const position = Array.isArray(rawTile.position)
      ? [Number(rawTile.position[0]), Number(rawTile.position[1])]
      : [0, 0];
    const value = typeof rawTile.value === "number" ? rawTile.value : 0;
    const kind = rawTile.kind === "obstacle" ? "obstacle" : "number";

    tiles[tileId] = {
      id: tileId,
      position: [position[0], position[1]],
      value,
      kind,
    };
  });

  getTileIdsFromBoard(board).forEach((tileId: string) => {
    if (!tiles[tileId]) {
      tiles[tileId] = {
        id: tileId,
        position: [0, 0],
        value: 2,
        kind: "number",
      };
    }
  });

  Object.entries(tiles).forEach(([tileId, tile]) => {
    const [x, y] = tile.position;
    if (board[y]?.[x] === tileId) {
      return;
    }

    const boardPosition = board.flatMap((row, rowIndex) =>
      row.map((cellId, cellIndex) => (cellId === tileId ? [cellIndex, rowIndex] : undefined)),
    ).find((position): position is [number, number] => !isNil(position));

    if (boardPosition) {
      tiles[tileId] = {
        ...tile,
        position: boardPosition,
      };
    }
  });

  const nextState: State = {
    board,
    tiles,
    tilesByIds: getTileIdsFromBoard(board),
    hasChanged: false,
    score: typeof rawState.score === "number" ? rawState.score : 0,
    status:
      rawState.status === "won" || rawState.status === "lost"
        ? rawState.status
        : "ongoing",
    dimension: inferredDimension,
    mode,
    nextExpansionValue:
      typeof rawState.nextExpansionValue === "number"
        ? rawState.nextExpansionValue
        : infiniteExpansionTileValue,
  };

  return cleanupState(nextState);
}

export default function gameReducer(
  state: State = initialState,
  action: Action,
) {
  switch (action.type) {
    case "clean_up":
      return cleanupState(state);
    case "create_tile":
      return insertTile(state, action.tile);
    case "move_up":
    case "move_down":
    case "move_left":
    case "move_right":
      return buildMovedState(state, action.type);
    case "reset_game":
      return createInitialState(action.mode ?? state.mode);
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    case "hydrate_state":
      return cleanupState(action.state);
    case "finalize_turn": {
      let nextState = cleanupState(state);

      if (action.expansion) {
        nextState = expandState(nextState, action.expansion);
      }

      if (action.tile) {
        nextState = insertTile(nextState, action.tile);
      }

      return {
        ...nextState,
        hasChanged: false,
      };
    }
    default:
      return state;
  }
}
