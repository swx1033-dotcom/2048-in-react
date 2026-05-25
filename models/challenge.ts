import { Tile, TileMap } from "@/models/tile";

export type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export type ChallengeConfig = Record<string, number | string | boolean>;

export type ChallengeState = {
  activeChallenges: string[];
  configs: Record<string, ChallengeConfig>;
  pluginStates: Record<string, Record<string, unknown>>;
  disabledDirections: MoveDirection[];
  isChallengeMode: boolean;
};

export type GameState = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: "ongoing" | "won" | "lost";
};

export type ChallengeEffect = {
  type: "create_tile" | "update_tile" | "remove_tile" | "set_plugin_state";
  payload: Record<string, unknown>;
};

export interface ChallengePlugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultConfig: ChallengeConfig;

  beforeAction?(
    action: { type: string; [key: string]: unknown },
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): { type: string; [key: string]: unknown } | null;

  afterMove?(
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): ChallengeEffect[];

  checkGameOver?(
    gameState: GameState,
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): boolean | null;

  initPluginState?(config: ChallengeConfig): Record<string, unknown>;

  getDisabledDirections?(
    pluginState: Record<string, unknown>,
    config: ChallengeConfig,
  ): MoveDirection[];
}

export const initialChallengeState: ChallengeState = {
  activeChallenges: [],
  configs: {},
  pluginStates: {},
  disabledDirections: [],
  isChallengeMode: false,
};
