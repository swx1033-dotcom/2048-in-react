import {
  ChallengeConfig,
  ChallengePluginContext,
  ChallengePluginResult,
  ChallengeState,
  Direction,
} from "@/models/challenge";

export type ConfigFieldType = "boolean" | "number" | "select" | "slider" | "toggle";

export type ConfigField = {
  key: string;
  label: string;
  type: ConfigFieldType;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: unknown }[];
};

export interface ChallengePlugin {
  id: string;
  name: string;
  emoji: string;
  description: string;
  configFields: ConfigField[];
  getConfigSchema(): ConfigField[];
  defaultConfig: ChallengeConfig;
  createDefaultState(): Partial<ChallengeState>;
  serializeState(state: Partial<ChallengeState>): Record<string, unknown>;
  deserializeState(data: Record<string, unknown>): Partial<ChallengeState>;
  onBeforeMove(ctx: ChallengePluginContext, config: ChallengeConfig): ChallengePluginResult;
  onAfterMove(ctx: ChallengePluginContext, config: ChallengeConfig): ChallengePluginResult;
  onTick?(ctx: ChallengePluginContext, config: ChallengeConfig): ChallengePluginResult;
  checkGameOver(ctx: ChallengePluginContext, config: ChallengeConfig): boolean;
  getDisabledDirections?(ctx: ChallengePluginContext, config: ChallengeConfig): Direction[];
}