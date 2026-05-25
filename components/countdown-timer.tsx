"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { GameContext } from "@/context/game-context";
import styles from "@/styles/countdown-timer.module.css";

const COUNTDOWN_DURATION = 5000;

export default function CountdownTimer() {
  const { status, mode, moveCount, makeRandomMove } = useContext(GameContext) as any;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_DURATION);

  const animate = (time: number) => {
    if (status !== "ongoing" || mode !== "competition") {
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, COUNTDOWN_DURATION - Math.floor(elapsed));

    setTimeLeft(remaining);

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(cx, cy) - 4; // 4px padding

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = "#eee";
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.beginPath();
        const startAngle = -0.5 * Math.PI;
        const endAngle = startAngle + (remaining / COUNTDOWN_DURATION) * 2 * Math.PI;
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.strokeStyle = remaining > 1000 ? "#f67c5f" : "#f59563"; // color changes when < 1s
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    if (remaining > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      makeRandomMove();
    }
  };

  useEffect(() => {
    if (status === "ongoing" && mode === "competition") {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [status, mode, moveCount, makeRandomMove]); // Restart when moveCount changes

  if (mode !== "competition" || status === "idle") {
    return null;
  }

  return (
    <div className={styles.timerContainer}>
      <canvas ref={canvasRef} width={60} height={60} className={styles.canvas} />
      <div className={styles.text}>{Math.ceil(timeLeft / 1000)}s</div>
    </div>
  );
}
