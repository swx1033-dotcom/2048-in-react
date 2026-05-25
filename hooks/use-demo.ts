import { useCallback, useEffect, useRef, useState } from "react";
import { mergeAnimationDuration } from "@/constants";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

const DIRECTIONS: MoveDirection[] = [
  "move_up",
  "move_down",
  "move_left",
  "move_right",
];

const DEMO_INTERVAL = 500;
const ANIMATION_BUFFER = 50;

export default function useDemo(
  moveTiles: (dir: MoveDirection) => void,
  status: string,
  startGame: () => void,
) {
  const [isDemoing, setIsDemoing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animatingRef = useRef(false);

  const clearDemoInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopDemo = useCallback(() => {
    setIsDemoing(false);
    clearDemoInterval();
    animatingRef.current = false;
  }, [clearDemoInterval]);

  const startDemo = useCallback(() => {
    startGame();
    setIsDemoing(true);
  }, [startGame]);

  useEffect(() => {
    if (!isDemoing) return;

    intervalRef.current = setInterval(() => {
      if (animatingRef.current) return;

      const randomDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      animatingRef.current = true;
      moveTiles(randomDir);

      setTimeout(() => {
        animatingRef.current = false;
      }, mergeAnimationDuration + ANIMATION_BUFFER);
    }, DEMO_INTERVAL);

    return () => {
      clearDemoInterval();
    };
  }, [isDemoing, moveTiles, clearDemoInterval]);

  useEffect(() => {
    if (isDemoing && (status === "won" || status === "lost")) {
      stopDemo();
    }
  }, [status, isDemoing, stopDemo]);

  useEffect(() => {
    if (!isDemoing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopDemo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDemoing, stopDemo]);

  return { isDemoing, startDemo, stopDemo };
}