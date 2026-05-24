import { useContext } from "react";
import { GameContext } from "@/context/game-context";
import styles from "@/styles/time-travel.module.css";

export default function TimeTravel() {
  const { historyLength, historyIndex, previewIndex, previewHistory, confirmHistory } = useContext(GameContext);

  if (historyLength <= 1) return null;

  const maxIndex = historyLength - 1;
  const currentIndex = previewIndex !== null ? previewIndex : historyIndex;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    previewHistory(Number(e.target.value));
  };

  const handleMouseUp = () => {
    confirmHistory();
  };

  const handleTouchEnd = () => {
    confirmHistory();
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        Time Travel: {currentIndex} / {maxIndex}
      </label>
      <input
        type="range"
        min="0"
        max={maxIndex}
        value={currentIndex}
        onChange={handleChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        className={styles.slider}
      />
    </div>
  );
}
