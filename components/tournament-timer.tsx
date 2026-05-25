import styles from "@/styles/tournament-timer.module.css";
import { tournamentTimeLimit } from "@/constants";

type Props = {
  remaining: number;
  progress: number;
};

const radius = 18;
const circumference = 2 * Math.PI * radius;

export default function TournamentTimer({ remaining, progress }: Props) {
  const seconds = Math.ceil(remaining / 1000);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={styles.timer}>
      <svg
        className={styles.svg}
        width="44"
        height="44"
        viewBox="0 0 44 44"
      >
        <circle
          className={styles.track}
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="3"
        />
        <circle
          className={styles.progress}
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className={styles.seconds}>{seconds}</span>
    </div>
  );
}

export { tournamentTimeLimit };