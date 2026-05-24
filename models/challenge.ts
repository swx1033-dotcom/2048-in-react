import { Tile, TileMap } from "./tile";

export type Direction = "move_up" | "move_down" | "move_left" | "move_right";

export type GameState = {
  board: string[][];
  tiles: TileMap;
  tilesByIds: string[];
  hasChanged: boolean;
  score: number;
  status: "ongoing" | "won" | "lost";
};

export type ChallengeConfig = {
  enabled: boolean;
  [key: string]: unknown;
};

export type ChallengeState = {
  obstacles: TileMap;
  obstaclePositions: Set<string>;
  mergeCount: number;
  countdownSeconds: number;
  countdownStarted: boolean;
  decayCounter: number;
  disabledDirection: Direction | null;
  disabledDirectionTimer: number;
};

export const defaultChallengeState: ChallengeState = {
  obstacles: {},
  obstaclePositions: new Set(),
  mergeCount: 0,
  countdownSeconds: 0,
  countdownStarted: false,
  decayCounter: 0,
  disabledDirection: null,
  disabledDirectionTimer: 0,
};

export type ChallengePluginContext = {
  state: GameState;
  challenge: ChallengeState;
  movedDirection: Direction | null;
  turnCount: number;
};

export type PluginAction =
  | { type: "create_tile"; tile: Tile }
  | { type: "update_tiles"; tiles: TileMap };

export type ChallengePluginResult = {
  state: GameState;
  challenge: ChallengeState;
  blocked: boolean;
  blockReason?: string;
  actions: PluginAction[];
};

export const CHALLENGE_STORAGE_VERSION = 1;