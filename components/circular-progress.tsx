import styles from "@/styles/circular-progress.module.css";

interface CircularProgressProps {
  progress: number;
  timeLeft: number;
}

export default function CircularProgress({ progress, timeLeft }: CircularProgressProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={styles.container}>
      <svg className={styles.svg} viewBox="0 0 100 100">
        <circle
          className={styles.circleBg}
          cx="50"
          cy="50"
          r={radius}
        />
        <circle
          className={styles.circleProgress}
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className={styles.timeLeft}>
        {timeLeft.toFixed(1)}s
      </div>
    </div>
  );
}
