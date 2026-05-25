import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext } from "react";

type SplashProps = {
  heading?: string;
  type?: string;
  onDemo?: () => void;
};

export default function Splash({ heading = "You won!", type = "", onDemo }: SplashProps) {
  const { startGame } = useContext(GameContext);

  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
        <button className={styles.button} onClick={startGame}>
          Play again
        </button>
        {onDemo && (
          <button className={styles.demoButton} onClick={onDemo}>
            {"\u25B6"} 自动演示
          </button>
        )}
      </div>
    </div>
  );
}
