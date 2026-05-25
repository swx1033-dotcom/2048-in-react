import { ChallengePlugin, ChallengeConfig } from "@/models/challenge";
import obstacleChallenge from "./obstacle";
import decayChallenge from "./decay";
import mergeLimitChallenge from "./merge-limit";
import countdownChallenge from "./countdown";
import disabledDirectionChallenge from "./disabled-direction";

class ChallengeRegistry {
  private plugins: Map<string, ChallengePlugin> = new Map();

  register(plugin: ChallengePlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): ChallengePlugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): ChallengePlugin[] {
    return Array.from(this.plugins.values());
  }

  getAllIds(): string[] {
    return Array.from(this.plugins.keys());
  }
}

const registry = new ChallengeRegistry();

registry.register(obstacleChallenge);
registry.register(decayChallenge);
registry.register(mergeLimitChallenge);
registry.register(countdownChallenge);
registry.register(disabledDirectionChallenge);

export function registerChallenge(plugin: ChallengePlugin): void {
  registry.register(plugin);
}

export function getChallenge(id: string): ChallengePlugin | undefined {
  return registry.get(id);
}

export function getAllChallenges(): ChallengePlugin[] {
  return registry.getAll();
}

export function getAllChallengeIds(): string[] {
  return registry.getAllIds();
}

export default registry;
