import { GameAction, createMoveAction } from "./action";
import { InputAdapter } from "./keyboard-adapter";

export type PointerAdapterOptions = {
  swipeThreshold?: number;
  diagonalThreshold?: number;
};

export function createPointerAdapter(
  options: PointerAdapterOptions = {},
): InputAdapter {
  const { swipeThreshold = 30, diagonalThreshold = 0.25 } = options;

  let startX = 0;
  let startY = 0;
  let isTracking = false;
  let trackingTarget: EventTarget | null = null;

  return {
    start(handler: (action: GameAction) => void) {
      const getSwipeDirection = (
        deltaX: number,
        deltaY: number,
      ): GameAction | null => {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (Math.abs(absX - absY) / Math.max(absX, absY) < diagonalThreshold) {
          return null;
        }

        if (absX > absY) {
          return createMoveAction(deltaX > 0 ? "move_right" : "move_left");
        } else {
          return createMoveAction(deltaY > 0 ? "move_down" : "move_up");
        }
      };

      const handlePointerDown = (e: PointerEvent) => {
        if (isTracking) return;
        isTracking = true;
        startX = e.clientX;
        startY = e.clientY;
        trackingTarget = e.target as EventTarget;
      };

      const handlePointerUp = (e: PointerEvent) => {
        if (!isTracking) return;

        const endX = e.clientX;
        const endY = e.clientY;
        const deltaX = endX - startX;
        const deltaY = endY - startY;

        if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
          const action = getSwipeDirection(deltaX, deltaY);
          if (action) {
            e.preventDefault();
            handler(action);
          }
        }

        isTracking = false;
        startX = 0;
        startY = 0;
        trackingTarget = null;
      };

      const handlePointerCancel = () => {
        isTracking = false;
        startX = 0;
        startY = 0;
        trackingTarget = null;
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (isTracking) return;
        if (e.touches.length !== 1) return;
        isTracking = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        trackingTarget = e.target as EventTarget;
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (!isTracking) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - startX;
        const deltaY = endY - startY;

        if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
          const action = getSwipeDirection(deltaX, deltaY);
          if (action) {
            e.preventDefault();
            handler(action);
          }
        }

        isTracking = false;
        startX = 0;
        startY = 0;
        trackingTarget = null;
      };

      window.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerCancel);
      window.addEventListener("touchstart", handleTouchStart, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { passive: false });

      return () => {
        window.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    },
  };
}