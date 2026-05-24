import { Tile, TileMap } from "@/models/tile";

export type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export type ChallengeConfig = {
  [key: string]: any;
};

export type ChallengeState = {
  [key: string]: any;
};

export interface ChallengePlugin {
  id: string;
  name: string;
  description: string;
  defaultConfig: ChallengeConfig;

  beforeMove?: (
    state: any,
    direction: MoveDirection,
    config: ChallengeConfig,
    challengeState: ChallengeState
  ) => { allowed: boolean; direction?: MoveDirection; state?: any };

  afterMove?: (
    state: any,
    direction: MoveDirection,
    config: ChallengeConfig,
    challengeState: ChallengeState
  ) => any;

  onTileCreate?: (
    tile: Tile,
    state: any,
    config: ChallengeConfig,
    challengeState: ChallengeState
  ) => Tile;

  beforeMerge?: (
    tile1: Tile,
    tile2: Tile,
    state: any,
    config: ChallengeConfig,
    challengeState: ChallengeState
  ) => { allowed: boolean };

  afterMerge?: (
    mergedTile: Tile,
    state: any,
    config: ChallengeConfig,
    challengeState: ChallengeState
  ) => Tile;

  checkGameOver?: (
    state: any,
    config: ChallengeConfig,
    challengeState: ChallengeState
  ) => { isOver: boolean; reason?: string };

  initState?: (config: ChallengeConfig) => ChallengeState;

  updateState?: (
    currentState: ChallengeState,
    action: any,
    config: ChallengeConfig
  ) => ChallengeState;
}

export type ActiveChallenge = {
  plugin: ChallengePlugin;
  config: ChallengeConfig;
  state: ChallengeState;
};
