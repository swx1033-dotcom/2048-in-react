import { useCallback, useEffect, useRef, useState } from "react";

export default function useCountdown(
  duration: number,
  onExpire: () => void,
  active: boolean,
) {
  const [remaining, setRemaining] = useState(duration);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    const elapsed = performance.now() - startTimeRef.current;
    const left = Math.max(0, duration - elapsed);

    setRemaining(left);

    if (left <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tickRef.current);
  };

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    expiredRef.current = false;
    startTimeRef.current = performance.now();
    setRemaining(duration);
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, [duration]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    expiredRef.current = true;
  }, []);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    expiredRef.current = false;
    startTimeRef.current = performance.now();
    setRemaining(duration);
    rafRef.current = requestAnimationFrame(tickRef.current);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, duration]);

  return {
    remaining,
    progress: remaining / duration,
    reset,
    stop,
  };
}