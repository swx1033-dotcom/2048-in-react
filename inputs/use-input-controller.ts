import { useCallback, useEffect, useMemo, useRef } from "react";
import { GameAction } from "./action";
import {
  InputController,
  InputControllerOptions,
  InputControllerState,
} from "./input-controller";
import { mergeAnimationDuration } from "@/constants";

export type UseInputControllerOptions = Omit<
  InputControllerOptions,
  "animationLockDuration"
>;

export function useInputController(
  onAction: (action: GameAction) => void,
  options: UseInputControllerOptions = {},
): InputControllerState {
  const controllerRef = useRef<InputController | null>(null);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const controller = useMemo(() => {
    return new InputController({
      ...options,
      animationLockDuration: mergeAnimationDuration,
    });
  }, []);

  controllerRef.current = controller;

  useEffect(() => {
    const cleanup = controller.start((action) => {
      onActionRef.current(action);
    });

    return cleanup;
  }, [controller]);

  const state = controller.getState();

  return state;
}