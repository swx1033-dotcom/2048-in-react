import { GameMode } from "@/models/tile";

export const defaultGameMode: GameMode = "4x4";

export const classicGameModes: GameMode[] = ["4x4", "5x5", "6x6"];

export const gameModeLabels: Record<GameMode, string> = {
  "4x4": "4×4",
  "5x5": "5×5",
  "6x6": "6×6",
  infinite: "无限",
};

export const mergeAnimationDuration = 100;

export const moveAnimationDuration = 200;

export const gameWinTileValue = 2048;

export const infiniteExpansionTileValue = 4096;

export const expansionObstacleCount = 1;

export const gameStateStorageKey = "2048-game-state";
