import { GameContext } from "@/context/game-context";
import styles from "@/styles/score.module.css";
import { useContext } from "react";

export default function UndoButton() {
  const { undo, canUndo } = useContext(GameContext);

  return (
    <div className={styles.score} style={{ cursor: canUndo ? "pointer" : "default", opacity: canUndo ? 1 : 0.5 }} onClick={canUndo ? undo : undefined}>
      Undo
      <div>Ctrl+Z</div>
    </div>
  );
}
