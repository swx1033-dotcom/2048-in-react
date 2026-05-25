import { isNil } from "lodash";
import { tileCountPerDimension, obstacleValue, defaultObstaclesPerMove, defaultMaxObstacles } from "@/constants";
import { ChallengePlugin, ChallengeConfig, GameState, ChallengeEffect } from "@/models/challenge";

const obstacleChallenge: ChallengePlugin = {
  id: "obstacle",
  name: "Obstacle",
  description: "Obstacle tiles appear after each move, blocking cells",
  icon: "🧱",
  defaultConfig: {
    obstaclesPerMove: defaultObstaclesPerMove,
    maxObstacles: defaultMaxObstacles,
  },

  afterMove(
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): ChallengeEffect[] {
    const effects: ChallengeEffect[] = [];
    const obstaclesPerMove = (config.obstaclesPerMove as number) || defaultObstaclesPerMove;
    const maxObstacles = (config.maxObstacles as number) || defaultMaxObstacles;

    const emptyCells: [number, number][] = [];
    let currentObstacleCount = 0;

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(gameState.board[y][x])) {
          emptyCells.push([x, y]);
        } else {
          const tileId = gameState.board[y][x];
          const tile = gameState.tiles[tileId];
          if (tile && tile.isObstacle) {
            currentObstacleCount++;
          }
        }
      }
    }

    const remaining = maxObstacles - currentObstacleCount;
    const toPlace = Math.min(obstaclesPerMove, remaining, emptyCells.length);

    for (let i = 0; i < toPlace; i++) {
      const availableCells = emptyCells.filter(
        (cell) => !effects.some((e) => {
          if (e.type !== "create_tile") return false;
          const tileData = e.payload.tile as { position: [number, number] } | undefined;
          return tileData && tileData.position[0] === cell[0] && tileData.position[1] === cell[1];
        }),
      );
      if (availableCells.length === 0) break;

      const cellIndex = Math.floor(Math.random() * availableCells.length);
      const [x, y] = availableCells[cellIndex];

      effects.push({
        type: "create_tile",
        payload: {
          tile: {
            position: [x, y],
            value: obstacleValue,
            isObstacle: true,
          },
        },
      });
    }

    return effects;
  },

  initPluginState(config: ChallengeConfig): Record<string, unknown> {
    return {
      obstacleCount: 0,
    };
  },
};

export default obstacleChallenge;
