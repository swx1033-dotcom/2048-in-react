import { uid } from "uid";
import { ChallengePlugin } from "../challenge-enhancer";
import { tileCountPerDimension } from "@/constants";

export const obstaclePlugin: ChallengePlugin = {
  name: "obstacle",
  onBeforeAction: (state, action) => {
    // Before move, map obstacles to unique negative values so they don't merge
    if (action.type.startsWith("move_")) {
      const config = state.challengeState?.config?.obstacle;
      if (!config?.enabled) return { state };

      let changed = false;
      const newTiles = { ...state.tiles };
      let counter = -1;
      
      for (const id of state.tilesByIds) {
        if (newTiles[id].isObstacle) {
          newTiles[id] = { ...newTiles[id], value: counter-- };
          changed = true;
        }
      }
      
      if (changed) {
        return { state: { ...state, tiles: newTiles } };
      }
    }
    return { state };
  },
  onAfterAction: (state, action) => {
    const config = state.challengeState?.config?.obstacle;
    if (!config?.enabled) return state;

    // After move, map obstacles back to -1
    if (action.type.startsWith("move_")) {
      let changed = false;
      const newTiles = { ...state.tiles };
      for (const id of state.tilesByIds) {
        if (newTiles[id].isObstacle && newTiles[id].value !== -1) {
          newTiles[id] = { ...newTiles[id], value: -1 };
          changed = true;
        }
      }
      state = changed ? { ...state, tiles: newTiles } : state;
    }

    // Generate obstacle on clean_up (end of turn)
    if (action.type === "clean_up") {
      const emptyCells: [number, number][] = [];
      for (let x = 0; x < tileCountPerDimension; x++) {
        for (let y = 0; y < tileCountPerDimension; y++) {
          if (!state.board[y][x]) {
            emptyCells.push([x, y]);
          }
        }
      }

      if (emptyCells.length > 0) {
        const numObstacles = config.frequency || 1;
        let newState = { ...state, board: JSON.parse(JSON.stringify(state.board)), tiles: { ...state.tiles }, tilesByIds: [...state.tilesByIds] };
        
        for (let i = 0; i < numObstacles && emptyCells.length > 0; i++) {
          const index = Math.floor(Math.random() * emptyCells.length);
          const pos = emptyCells.splice(index, 1)[0];
          
          const tileId = uid();
          newState.board[pos[1]][pos[0]] = tileId;
          newState.tiles[tileId] = {
            id: tileId,
            position: pos,
            value: -1,
            isObstacle: true
          };
          newState.tilesByIds.push(tileId);
        }
        return newState;
      }
    }
    return state;
  }
};
