import { ChallengePlugin } from "./types";
import { obstaclePlugin } from "./plugins/obstacle";
import { decayPlugin } from "./plugins/decay";
import { mergeLimitPlugin } from "./plugins/merge-limit";
import { countdownPlugin } from "./plugins/countdown";
import { directionDisablePlugin } from "./plugins/direction-disable";

export const allChallengePlugins: ChallengePlugin[] = [
  obstaclePlugin,
  decayPlugin,
  mergeLimitPlugin,
  countdownPlugin,
  directionDisablePlugin,
];

export { obstaclePlugin } from "./plugins/obstacle";
export { decayPlugin } from "./plugins/decay";
export { mergeLimitPlugin } from "./plugins/merge-limit";
export { countdownPlugin } from "./plugins/countdown";
export { directionDisablePlugin } from "./plugins/direction-disable";
export { createPluginManager } from "./plugin-manager";
export {
  serializeChallengeState,
  deserializeChallengeState,
} from "./plugin-manager";
export type { PluginManager } from "./plugin-manager";
export type { ChallengePlugin, ConfigField } from "./types";