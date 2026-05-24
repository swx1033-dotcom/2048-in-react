import { useContext } from "react";
import { GameContext } from "@/context/game-context";
import styles from "@/styles/time-slider.module.css";

export default function TimeSlider() {
  const { 
    historyLength, 
    historyIndex, 
    isPreviewing, 
    setPreview, 
    goToStep 
  } = useContext(GameContext);

  const currentValue = isPreviewing ? historyIndex : historyIndex;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    setPreview(index);
  };

  const handleMouseUp = () => {
    goToStep(currentValue);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      goToStep(currentValue);
    }
  };

  if (historyLength <= 1) {
    return null;
  }

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderLabel}>
        <span>步骤 {currentValue + 1} / {historyLength}</span>
        {isPreviewing && <span className={styles.previewing}>（预览中）</span>}
      </div>
      <input
        type="range"
        min={0}
        max={historyLength - 1}
        value={currentValue}
        className={styles.slider}
        onChange={handleInputChange}
        onMouseUp={handleMouseUp}
        onKeyUp={handleKeyUp}
        onTouchEnd={handleMouseUp}
      />
    </div>
  );
}
