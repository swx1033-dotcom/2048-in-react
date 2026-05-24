import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { isNil, throttle } from "lodash";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState, State as GameState } from "@/reducers/game-reducer";
import challengeReducer, { initialChallengeState, ChallengeStateType } from "@/reducers/challenge-reducer";
import {
  ChallengePlugin,
  MoveDirection,
  ChallengeConfig,
  obstaclePlugin,
  decayPlugin,
  mergeLimitPlugin,
  countdownPlugin,
  randomDisablePlugin,
} from "@/challenges";

const allPlugins = [
  obstaclePlugin,
  decayPlugin,
  mergeLimitPlugin,
  countdownPlugin,
  randomDisablePlugin,
];

type GameContextType = {
  score: number;
  status: "ongoing" | "won" | "lost";
  moveTiles: (direction: MoveDirection) => void;
  getTiles: () => Tile[];
  startGame: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeChallenges: ChallengeStateType["activeChallenges"];
  availablePlugins: ChallengePlugin[];
  enableChallenge: (plugin: ChallengePlugin, config?: ChallengeConfig) => void;
  disableChallenge: (pluginId: string) => void;
  getChallengeState: (pluginId: string) => any;
};

export const GameContext = createContext<GameContextType>({
  score: 0,
  status: "ongoing",
  moveTiles: (_: MoveDirection) => {},
  getTiles: () => [] as Tile[],
  startGame: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
  activeChallenges: [],
  availablePlugins: [],
  enableChallenge: () => {},
  disableChallenge: () => {},
  getChallengeState: () => ({}),
});

function getPlugin(id: string): ChallengePlugin | undefined {
  return allPlugins.find(p => p.id === id);
}

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, gameDispatch] = useReducer(gameReducer, initialState);
  const [challengeState, challengeDispatch] = useReducer(challengeReducer, initialChallengeState);
  const isProcessingMove = useRef(false);

  const getEmptyCells = (state: GameState = gameState) => {
    const results: [number, number][] = [];
    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(state.board[y][x])) {
          results.push([x, y]);
        }
      }
    }
    return results;
  };

  const appendRandomTile = (state: GameState) => {
    const emptyCells = getEmptyCells(state);
    if (emptyCells.length > 0) {
      const cellIndex = Math.floor(Math.random() * emptyCells.length);
      const newTile = {
        position: emptyCells[cellIndex],
        value: 2,
      };
      gameDispatch({ type: "create_tile", tile: newTile });
    }
  };

  const getTiles = () => {
    return gameState.tilesByIds.map((tileId) => gameState.tiles[tileId]);
  };

  const saveToHistory = (state: GameState) => {
    challengeDispatch({ type: "save_to_history", state: JSON.parse(JSON.stringify(state)) });
  };

  const undo = () => {
    if (challengeState.historyIndex > 0) {
      challengeDispatch({ type: "undo" });
      const prevIndex = challengeState.historyIndex - 1;
      if (prevIndex >= 0 && challengeState.history[prevIndex]) {
        gameDispatch({ type: "restore_state", state: challengeState.history[prevIndex] });
      }
    }
  };

  const redo = () => {
    if (challengeState.historyIndex < challengeState.history.length - 1) {
      challengeDispatch({ type: "redo" });
      const nextIndex = challengeState.historyIndex + 1;
      if (challengeState.history[nextIndex]) {
        gameDispatch({ type: "restore_state", state: challengeState.history[nextIndex] });
      }
    }
  };

  const checkGameState = (state: GameState) => {
    for (const active of challengeState.activeChallenges) {
      const plugin = getPlugin(active.pluginId);
      if (plugin?.checkGameOver) {
        const result = plugin.checkGameOver(state, active.config, active.state);
        if (result.isOver) {
          gameDispatch({ type: "update_status", status: "lost" });
          return;
        }
      }
    }

    const isWon =
      Object.values(state.tiles).filter((t) => t.value === gameWinTileValue)
        .length > 0;

    if (isWon) {
      gameDispatch({ type: "update_status", status: "won" });
      return;
    }

    const { tiles, board } = state;
    const maxIndex = tileCountPerDimension - 1;
    for (let x = 0; x < maxIndex; x += 1) {
      for (let y = 0; y < maxIndex; y += 1) {
        if (
          isNil(state.board[x][y]) ||
          isNil(state.board[x + 1][y]) ||
          isNil(state.board[x][y + 1])
        ) {
          return;
        }

        if (tiles[board[x][y]].value === tiles[board[x + 1][y]].value) {
          return;
        }

        if (tiles[board[x][y]].value === tiles[board[x][y + 1]].value) {
          return;
        }
      }
    }

    gameDispatch({ type: "update_status", status: "lost" });
  };

  const moveTiles = useCallback(
    throttle(
      (direction: MoveDirection) => {
        if (isProcessingMove.current || gameState.status !== "ongoing") return;
        isProcessingMove.current = true;

        let allowed = true;
        let finalDirection = direction;

        for (const active of challengeState.activeChallenges) {
          const plugin = getPlugin(active.pluginId);
          if (plugin?.beforeMove) {
            const result = plugin.beforeMove(gameState, finalDirection, active.config, active.state);
            if (!result.allowed) {
              allowed = false;
              break;
            }
            if (result.direction) {
              finalDirection = result.direction;
            }
          }
        }

        if (!allowed) {
          isProcessingMove.current = false;
          return;
        }

        saveToHistory(gameState);
        gameDispatch({ type: finalDirection });
      },
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [gameState, challengeState],
  );

  useEffect(() => {
    if (gameState.hasChanged) {
      setTimeout(() => {
        gameDispatch({ type: "clean_up" });
        
        let currentState = { ...gameState };
        let updatedChallenges = [...challengeState.activeChallenges];

        for (let i = 0; i < updatedChallenges.length; i++) {
          const active = updatedChallenges[i];
          const plugin = getPlugin(active.pluginId);
          
          if (plugin?.afterMove) {
            const result = plugin.afterMove(
              currentState,
              "move_up",
              active.config,
              active.state
            );
            if (result.newState) {
              currentState = result.newState;
            }
            if (result.newChallengeState) {
              updatedChallenges[i] = {
                ...active,
                state: result.newChallengeState,
              };
            }
          }
        }

        if (updatedChallenges !== challengeState.activeChallenges) {
          updatedChallenges.forEach((c) => {
            challengeDispatch({
              type: "update_challenge_state",
              pluginId: c.pluginId,
              newState: c.state,
            });
          });
        }

        appendRandomTile(currentState);
        isProcessingMove.current = false;
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged && !isProcessingMove.current) {
      checkGameState(gameState);
    }
  }, [gameState.hasChanged]);

  const startGame = () => {
    challengeDispatch({ type: "reset_challenges" });
    gameDispatch({ type: "reset_game" });
    gameDispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    gameDispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
    isProcessingMove.current = false;
  };

  const enableChallenge = (plugin: ChallengePlugin, config?: ChallengeConfig) => {
    challengeDispatch({ type: "enable_challenge", plugin, config });
  };

  const disableChallenge = (pluginId: string) => {
    challengeDispatch({ type: "disable_challenge", pluginId });
  };

  const getChallengeState = (pluginId: string) => {
    const active = challengeState.activeChallenges.find(c => c.pluginId === pluginId);
    return active?.state || {};
  };

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        getTiles,
        moveTiles,
        startGame,
        undo,
        redo,
        canUndo: challengeState.historyIndex > 0,
        canRedo: challengeState.historyIndex < challengeState.history.length - 1,
        activeChallenges: challengeState.activeChallenges,
        availablePlugins: allPlugins,
        enableChallenge,
        disableChallenge,
        getChallengeState,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
