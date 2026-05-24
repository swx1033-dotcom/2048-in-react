import gameReducer, {
  canMove,
  createInitialState,
  expandState,
  migratePersistedState,
} from "@/reducers/game-reducer";
import { Tile } from "@/models/tile";

describe("gameReducer", () => {
  const appendTiles = (tiles: Tile[], mode: Parameters<typeof createInitialState>[0] = "4x4") => {
    return tiles.reduce(
      (state, tile) => gameReducer(state, { type: "create_tile", tile }),
      createInitialState(mode),
    );
  };

  it("supports dynamic board dimensions", () => {
    expect(createInitialState("4x4").board).toHaveLength(4);
    expect(createInitialState("5x5").board).toHaveLength(5);
    expect(createInitialState("6x6").board).toHaveLength(6);
    expect(createInitialState("infinite").board).toHaveLength(4);
  });

  it("adapts movement and merge logic to 5x5 boards", () => {
    const state = appendTiles(
      [
        { position: [0, 4], value: 2 },
        { position: [0, 2], value: 2 },
      ],
      "5x5",
    );

    const nextState = gameReducer(state, { type: "move_up" });
    const mergedTileId = nextState.board[0][0] as string;

    expect(nextState.dimension).toBe(5);
    expect(nextState.tiles[mergedTileId].value).toBe(4);
    expect(nextState.score).toBe(4);
    expect(nextState.board.flat().filter(Boolean)).toHaveLength(1);
  });

  it("keeps obstacle tiles fixed and prevents merging across them", () => {
    const state = appendTiles(
      [
        { position: [0, 0], value: 2 },
        { position: [2, 0], value: 0, kind: "obstacle" },
        { position: [3, 0], value: 2 },
      ],
      "4x4",
    );

    const nextState = gameReducer(state, { type: "move_left" });

    expect(nextState.board[0][0]).toBeTruthy();
    expect(nextState.board[0][1]).toBeUndefined();
    expect(nextState.board[0][2]).toBeTruthy();
    expect(nextState.tiles[nextState.board[0][2] as string].kind).toBe("obstacle");
    expect(nextState.board[0][3]).toBeTruthy();
    expect(nextState.tiles[nextState.board[0][3] as string].value).toBe(2);
    expect(nextState.score).toBe(0);
  });

  it("expands infinite boards by one ring while preserving score and shifting positions correctly", () => {
    const state = appendTiles(
      [
        { position: [1, 1], value: 4096 },
        { position: [2, 2], value: 8 },
      ],
      "infinite",
    );

    const expandedState = expandState(state, {
      obstacleTiles: [{ position: [0, 0], value: 0, kind: "obstacle" }],
      nextExpansionValue: 8192,
    });

    expect(expandedState.dimension).toBe(6);
    expect(expandedState.score).toBe(0);
    expect(expandedState.nextExpansionValue).toBe(8192);

    const tiles = Object.values(expandedState.tiles);
    expect(tiles.find((tile) => tile.value === 4096)?.position).toEqual([2, 2]);
    expect(tiles.find((tile) => tile.value === 8)?.position).toEqual([3, 3]);
    expect(tiles.find((tile) => tile.kind === "obstacle")?.position).toEqual([0, 0]);
  });

  it("migrates old persisted saves without dropping score", () => {
    const migratedState = migratePersistedState({
      board: [
        ["tile-a", undefined, undefined, undefined],
        [undefined, undefined, undefined, undefined],
        [undefined, undefined, undefined, undefined],
        [undefined, undefined, undefined, undefined],
      ],
      tiles: {
        "tile-a": {
          position: [0, 0],
          value: 4,
        },
      },
      score: 128,
      status: "ongoing",
    });

    expect(migratedState).not.toBeNull();
    expect(migratedState?.dimension).toBe(4);
    expect(migratedState?.mode).toBe("4x4");
    expect(migratedState?.score).toBe(128);
    expect(migratedState?.tiles["tile-a"].kind).toBe("number");
  });

  it("detects game over on arbitrary dimensions", () => {
    const state = appendTiles(
      [
        { position: [0, 0], value: 2 },
        { position: [1, 0], value: 4 },
        { position: [2, 0], value: 2 },
        { position: [0, 1], value: 4 },
        { position: [1, 1], value: 2 },
        { position: [2, 1], value: 4 },
        { position: [0, 2], value: 2 },
        { position: [1, 2], value: 4 },
        { position: [2, 2], value: 2 },
      ],
      "5x5",
    );

    expect(canMove(state)).toBe(true);

    const fullBlockedState = appendTiles(
      [
        { position: [0, 0], value: 2 },
        { position: [1, 0], value: 4 },
        { position: [2, 0], value: 2 },
        { position: [3, 0], value: 4 },
        { position: [4, 0], value: 2 },
        { position: [0, 1], value: 4 },
        { position: [1, 1], value: 2 },
        { position: [2, 1], value: 4 },
        { position: [3, 1], value: 2 },
        { position: [4, 1], value: 4 },
        { position: [0, 2], value: 2 },
        { position: [1, 2], value: 4 },
        { position: [2, 2], value: 2 },
        { position: [3, 2], value: 4 },
        { position: [4, 2], value: 2 },
        { position: [0, 3], value: 4 },
        { position: [1, 3], value: 2 },
        { position: [2, 3], value: 4 },
        { position: [3, 3], value: 2 },
        { position: [4, 3], value: 4 },
        { position: [0, 4], value: 2 },
        { position: [1, 4], value: 4 },
        { position: [2, 4], value: 2 },
        { position: [3, 4], value: 4 },
        { position: [4, 4], value: 2 },
      ],
      "5x5",
    );

    expect(canMove(fullBlockedState)).toBe(false);
  });
});
