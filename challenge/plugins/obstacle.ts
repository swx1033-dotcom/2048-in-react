import { uid } from "uid";
import { isNil } from "lodash";
import {
  ChallengeConfig,
  ChallengePluginContext,
  ChallengePluginResult,
  ChallengeState,
} from "@/models/challenge";
import { tileCountPerDimension } from "@/constants";
import { Tile } from "@/models/tile";
import { ChallengePlugin, ConfigField } from "../types";
import { posKey } from "../plugin-manager";

function getEmptyCells(
  board: string[][],
  obstaclePositions: Set<string>,
): [number, number][] {
  const results: [number, number][] = [];
  for (let x = 0; x < tileCountPerDimension; x++) {
    for (let y = 0; y < tileCountPerDimension; y++) {
      if (isNil(board[y][x]) && !obstaclePositions.has(posKey(x, y))) {
        results.push([x, y]);
      }
    }
  }
  return results;
}

const configSchema = (): ConfigField[] => [
  {
    key: "obstaclesPerTurn",
    label: "Obstacles per turn",
    type: "number",
    defaultValue: 1,
    min: 1,
    max: 4,
    step: 1,
  },
];

export const obstaclePlugin: ChallengePlugin = {
  id: "obstacle",
  name: "Obstacles",
  emoji: "🧱",
  description:
    "Random obstacles appear on the board each turn, blocking tile movement.",
  configFields: configSchema(),
  defaultConfig: {
    enabled: false,
    obstaclesPerTurn: 1,
  },
  getConfigSchema: configSchema,
  createDefaultState(): Partial<ChallengeState> {
    return {
      obstacles: {},
      obstaclePositions: new Set(),
    };
  },
  serializeState(
    state: Partial<ChallengeState>,
  ): Record<string, unknown> {
    return {
      obstacles: state.obstacles || {},
      obstaclePositions: state.obstaclePositions
        ? Array.from(state.obstaclePositions)
        : [],
    };
  },
  deserializeState(data: Record<string, unknown>): Partial<ChallengeState> {
    const arr = Array.isArray(data.obstaclePositions)
      ? data.obstaclePositions.filter(
          (v): v is string => typeof v === "string",
        )
      : [];
    return {
      obstacles: (data.obstacles || {}) as Record<
        string,
        Tile
      >,
      obstaclePositions: new Set(arr),
    };
  },
  onBeforeMove(
    ctx: ChallengePluginContext,
  ): ChallengePluginResult {
    return {
      state: ctx.state,
      challenge: ctx.challenge,
      blocked: false,
      actions: [],
    };
  },
  onAfterMove(
    ctx: ChallengePluginContext,
    config: ChallengeConfig,
  ): ChallengePluginResult {
    const { state, challenge } = ctx;
    const count = (config.obstaclesPerTurn as number) || 1;

    const emptyCells = getEmptyCells(state.board, challenge.obstaclePositions);
    if (emptyCells.length === 0) {
      return { state, challenge, blocked: false, actions: [] };
    }

    const newObstacles = { ...challenge.obstacles };
    const newPositions = new Set(challenge.obstaclePositions);

    const shuffled = [...emptyCells].sort(() => Math.random() - 0.5);
    const toPlace = Math.min(count, shuffled.length);
    const actions: ChallengePluginResult["actions"] = [];

    for (let i = 0; i < toPlace; i++) {
      const [x, y] = shuffled[i];
      const key = posKey(x, y);
      const obstacleId = `obs-${uid()}`;
      newObstacles[obstacleId] = {
        id: obstacleId,
        position: [x, y] as [number, number],
        value: -1,
      };
      newPositions.add(key);
      actions.push({
        type: "create_tile",
        tile: newObstacles[obstacleId],
      });
    }

    return {
      state,
      challenge: {
        ...challenge,
        obstacles: newObstacles,
        obstaclePositions: newPositions,
      },
      blocked: false,
      actions,
    };
  },
  checkGameOver(): boolean {
    return false;
  },
};