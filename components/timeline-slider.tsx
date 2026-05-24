import { GameContext } from "@/context/game-context";
import styles from "@/styles/timeline.module.css";
import { useCallback, useContext, useRef } from "react";

export default function TimelineSlider() {
  const { history, historyIndex, jumpToState, confirmJump, setPreviewing } =
    useContext(GameContext);

  const sliderRef = useRef<HTMLInputElement>(null);

  const totalSteps = history.length;
  const currentStep = historyIndex + 1;

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = parseInt(e.target.value, 10) - 1;
      setPreviewing(true);
      jumpToState(index);
    },
    [jumpToState, setPreviewing],
  );

  const handleChange = useCallback(
    (_e: React.ChangeEvent<HTMLInputElement>) => {
      setPreviewing(false);
      confirmJump();
    },
    [confirmJump, setPreviewing],
  );

  const handleMouseUp = useCallback(() => {
    setPreviewing(false);
    confirmJump();
  }, [confirmJump, setPreviewing]);

  const handleTouchEnd = useCallback(() => {
    setPreviewing(false);
    confirmJump();
  }, [confirmJump, setPreviewing]);

  if (totalSteps === 0) {
    return null;
  }

  return (
    <div className={styles.timeline}>
      <span className={styles.label}>
        {currentStep}/{totalSteps}
      </span>
      <input
        ref={sliderRef}
        type="range"
        className={styles.slider}
        min={1}
        max={totalSteps}
        value={currentStep}
        onInput={handleInput}
        onChange={handleChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}