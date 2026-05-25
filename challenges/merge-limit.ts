import { defaultMaxMergesPerMove } from "@/constants";
import { ChallengePlugin, ChallengeConfig, GameState, ChallengeEffect, MoveDirection } from "@/models/challenge";
import gameReducer from "@/reducers/game-reducer";

const allDirections: MoveDirection[] = ["move_up", "move_down", "move_left", "move_right"];
const moveActions = new Set<string>(allDirections);

const mergeLimitChallenge: ChallengePlugin = {
  id: "merge_limit",
  name: "Merge Limit",
  description: "Limit the number of merges per move",
  icon: "🔒",
  defaultConfig: {
    maxMergesPerMove: defaultMaxMergesPerMove,
  },

  beforeAction(
    action: { type: string; [key: string]: unknown },
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): { type: string; [key: string]: unknown } | null {
    if (!moveActions.has(action.type)) {
      return action;
    }

    const maxMerges = (config.maxMergesPerMove as number) || defaultMaxMergesPerMove;

    const simulatedState = gameReducer(
      {
        board: gameState.board,
        tiles: gameState.tiles,
        tilesByIds: gameState.tilesByIds,
        hasChanged: gameState.hasChanged,
        score: gameState.score,
        status: gameState.status,
      },
      { type: action.type as MoveDirection } as any,
    );

    const scoreDiff = simulatedState.score - gameState.score;
    let mergeCount = 0;

    if (scoreDiff > 0) {
      for (const tileId of Object.keys(simulatedState.tiles)) {
        const newTile = simulatedState.tiles[tileId];
        const oldTile = gameState.tiles[tileId];
        if (oldTile && newTile.value > oldTile.value && !oldTile.isObstacle) {
          mergeCount++;
        }
      }
    }

    if (mergeCount > maxMerges) {
      return null;
    }

    return action;
  },

  initPluginState(config: ChallengeConfig): Record<string, unknown> {
    return {
      mergesThisMove: 0,
    };
  },
};

export default mergeLimitChallenge;
