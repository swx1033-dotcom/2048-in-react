import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext } from "react";

type SplashProps = {
  heading?: string;
  type?: "" | "won" | "lost" | "demo";
};

export default function Splash({ heading = "You won!", type = "" }: SplashProps) {
  const { startDemo, startGame } = useContext(GameContext);
  const isResult = type === "won" || type === "lost";

  return (
    <div
      className={`${styles.splash} ${type === "won" ? styles.win : ""} ${
        type === "lost" ? styles.lost : ""
      } ${type === "demo" ? styles.demo : ""}`}
    >
      <div>
        <h1>{heading}</h1>
        {type === "demo" && <p className={styles.hint}>按 Esc 可停止演示</p>}
        {isResult && (
          <div className={styles.actions}>
            <button className={styles.button} onClick={startGame}>
              Play again
            </button>
            <button className={styles.button} onClick={() => startDemo()}>
              ▶ 自动演示
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
