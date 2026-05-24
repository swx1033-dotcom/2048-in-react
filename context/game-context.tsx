import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { throttle } from "lodash";
import { mergeAnimationDuration } from "@/constants";
import { Tile } from "@/models/tile";
import gameReducer, { initialState } from "@/reducers/game-reducer";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

type GameContextValue = {
  score: number;
  status: "ongoing" | "won" | "lost";
  canUndo: boolean;
  moveTiles: (_: MoveDirection) => void;
  undo: () => void;
  getTiles: () => Tile[];
  startGame: () => void;
};

export const GameContext = createContext<GameContextValue>({
  score: 0,
  status: "ongoing",
  canUndo: false,
  moveTiles: (_: MoveDirection) => {},
  undo: () => {},
  getTiles: () => [],
  startGame: () => {},
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const finalizeMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const getTiles = () => {
    return gameState.tilesByIds.map((tileId: string) => gameState.tiles[tileId]);
  };

  const moveTiles = useMemo(
    () =>
      throttle(
        (type: MoveDirection) => dispatch({ type }),
        mergeAnimationDuration * 1.05,
        { trailing: false },
      ),
    [dispatch],
  );

  const clearPendingFinalizeMove = useCallback(() => {
    if (finalizeMoveTimeoutRef.current) {
      clearTimeout(finalizeMoveTimeoutRef.current);
      finalizeMoveTimeoutRef.current = undefined;
    }
  }, []);

  const undo = useCallback(() => {
    clearPendingFinalizeMove();
    dispatch({ type: "undo" });
  }, [clearPendingFinalizeMove]);

  const startGame = useCallback(() => {
    clearPendingFinalizeMove();
    dispatch({ type: "start_game" });
  }, [clearPendingFinalizeMove]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      return;
    }

    finalizeMoveTimeoutRef.current = setTimeout(() => {
      dispatch({ type: "finalize_move" });
      finalizeMoveTimeoutRef.current = undefined;
    }, mergeAnimationDuration);

    return clearPendingFinalizeMove;
  }, [clearPendingFinalizeMove, gameState.hasChanged]);

  useEffect(() => {
    return () => {
      clearPendingFinalizeMove();
      moveTiles.cancel();
    };
  }, [clearPendingFinalizeMove, moveTiles]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        canUndo: gameState.hasChanged || gameState.history.length > 1,
        getTiles,
        moveTiles,
        undo,
        startGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
