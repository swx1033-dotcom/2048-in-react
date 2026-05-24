import { ChallengePlugin } from "./types";
import { Tile, TileMap } from "@/models/tile";
import { tileCountPerDimension } from "@/constants";
import { isNil } from "lodash";
import { uid } from "uid";

export const obstaclePlugin: ChallengePlugin = {
  id: "obstacle",
  name: "Obstacle Generator",
  description: "Generates obstacle tiles that block movement each turn",
  defaultConfig: {
    obstacleChance: 0.3,
    maxObstacles: 4,
  },

  initState: () => ({
    obstacleCount: 0,
  }),

  afterMove: (state, direction, config, challengeState) => {
    const { obstacleChance, maxObstacles } = config;
    let newState = { ...state };
    let newChallengeState = { ...challengeState };

    if (Math.random() < obstacleChance) {
      const emptyCells: [number, number][] = [];
      for (let x = 0; x < tileCountPerDimension; x++) {
        for (let y = 0; y < tileCountPerDimension; y++) {
          if (isNil(newState.board[y][x])) {
            emptyCells.push([x, y]);
          }
        }
      }

      const currentObstacles = Object.values(newState.tiles).filter(
        (t) => t.type === "obstacle"
      ).length;

      if (emptyCells.length > 0 && currentObstacles < maxObstacles) {
        const cellIndex = Math.floor(Math.random() * emptyCells.length);
        const [x, y] = emptyCells[cellIndex];
        const tileId = uid();

        const newBoard = JSON.parse(JSON.stringify(newState.board));
        newBoard[y][x] = tileId;

        newState = {
          ...newState,
          board: newBoard,
          tiles: {
            ...newState.tiles,
            [tileId]: {
              id: tileId,
              position: [x, y],
              value: 0,
              type: "obstacle",
            },
          },
          tilesByIds: [...newState.tilesByIds, tileId],
        };
        newChallengeState.obstacleCount = currentObstacles + 1;
      }
    }

    return { newState, newChallengeState };
  },
};
