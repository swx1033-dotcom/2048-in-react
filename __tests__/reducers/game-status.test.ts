import { Tile } from "@/models/tile";
import gameReducer, {
  initialState,
  isGameOver,
  State,
} from "@/reducers/game-reducer";

const gameOverTiles: Tile[] = [
  { position: [0, 0], value: 2 },
  { position: [1, 0], value: 4 },
  { position: [2, 0], value: 2 },
  { position: [3, 0], value: 4 },
  { position: [0, 1], value: 4 },
  { position: [1, 1], value: 2 },
  { position: [2, 1], value: 4 },
  { position: [3, 1], value: 2 },
  { position: [0, 2], value: 2 },
  { position: [1, 2], value: 4 },
  { position: [2, 2], value: 2 },
  { position: [3, 2], value: 4 },
  { position: [0, 3], value: 4 },
  { position: [1, 3], value: 2 },
  { position: [2, 3], value: 4 },
  { position: [3, 3], value: 2 },
];

function populateState(tiles: Tile[]): State {
  return tiles.reduce<State>(
    (state, tile) => gameReducer(state, { type: "create_tile", tile }),
    initialState,
  );
}

describe("game status", () => {
  describe("isGameOver", () => {
    it("returns false when the board still has empty cells", () => {
      const state = populateState(gameOverTiles.slice(0, 15));

      expect(isGameOver(state.board, state.tiles)).toBeFalsy();
    });

    it("returns false when a merge is still possible", () => {
      const state = populateState([
        ...gameOverTiles.slice(0, 15),
        { position: [3, 3], value: 4 },
      ]);

      expect(isGameOver(state.board, state.tiles)).toBeFalsy();
    });

    it("returns true when the board is full and no merges remain", () => {
      const state = populateState(gameOverTiles);

      expect(isGameOver(state.board, state.tiles)).toBeTruthy();
    });
  });

  it("marks the game as won when a 2048 tile appears", () => {
    const state = populateState([{ position: [0, 0], value: 2048 }]);

    expect(state.status).toEqual("won");
    expect(state.hasWon).toBeTruthy();
  });

  it("allows continuing after the win modal is dismissed", () => {
    const wonState = populateState([{ position: [0, 0], value: 2048 }]);
    const continuedState = gameReducer(wonState, { type: "continue_game" });

    expect(continuedState.status).toEqual("ongoing");
    expect(continuedState.hasWon).toBeTruthy();
  });

  it("marks the game as lost when the board becomes unplayable", () => {
    const state = populateState(gameOverTiles);

    expect(state.status).toEqual("lost");
  });
});
