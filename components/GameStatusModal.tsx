import { GameStatus } from "@/reducers/game-reducer";
import styles from "@/styles/game-status-modal.module.css";

type GameStatusModalProps = {
  status: Exclude<GameStatus, "ongoing">;
  onRestart: () => void;
  onContinue?: () => void;
};

const fireworks = [
  { top: "14%", left: "18%", delay: "0ms" },
  { top: "20%", left: "76%", delay: "140ms" },
  { top: "34%", left: "50%", delay: "280ms" },
  { top: "64%", left: "22%", delay: "420ms" },
  { top: "68%", left: "74%", delay: "560ms" },
  { top: "46%", left: "12%", delay: "700ms" },
  { top: "52%", left: "86%", delay: "840ms" },
];

const modalConfig = {
  won: {
    title: "2048!",
    description: "恭喜你达成目标分块，是否继续挑战更高分数？",
    accentClassName: styles.won,
    buttonLabel: "继续挑战",
  },
  lost: {
    title: "Game Over",
    description: "棋盘已满且没有可合并的相邻方块，再试一次吧。",
    accentClassName: styles.lost,
    buttonLabel: "重试",
  },
} as const;

export default function GameStatusModal({
  status,
  onRestart,
  onContinue,
}: GameStatusModalProps) {
  const config = modalConfig[status];
  const showCelebration = status === "won";

  return (
    <div className={`${styles.overlay} ${config.accentClassName}`}>
      {showCelebration && <div className={styles.flash} />}
      {showCelebration && (
        <div className={styles.fireworks}>
          {fireworks.map((firework, index) => (
            <span
              key={`${firework.top}-${firework.left}-${index}`}
              className={styles.firework}
              style={{
                top: firework.top,
                left: firework.left,
                animationDelay: firework.delay,
              }}
            />
          ))}
        </div>
      )}
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h1>{config.title}</h1>
        <p>{config.description}</p>
        <div className={styles.actions}>
          {status === "won" && onContinue && (
            <button className={styles.secondaryButton} onClick={onContinue}>
              {config.buttonLabel}
            </button>
          )}
          <button className={styles.primaryButton} onClick={onRestart}>
            {status === "won" ? "重新开始" : config.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
