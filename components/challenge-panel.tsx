import { useContext } from "react";
import { ChallengeContext } from "@/context/challenge-context";
import { GameContext } from "@/context/game-context";
import { getAllChallenges } from "@/challenges/registry";
import styles from "@/styles/challenge-panel.module.css";

export default function ChallengePanel() {
  const {
    challengeState,
    toggleChallenge,
    startChallengeMode,
    stopChallengeMode,
    isChallengeMode,
  } = useContext(ChallengeContext);
  const { startGame, status } = useContext(GameContext);

  const challenges = getAllChallenges();

  const handleStartChallenge = () => {
    if (challengeState.activeChallenges.length === 0) return;
    startChallengeMode();
    startGame();
  };

  const handleStopChallenge = () => {
    stopChallengeMode();
    startGame();
  };

  if (isChallengeMode && status === "ongoing") {
    return (
      <div className={styles.activeInfo}>
        <div className={styles.activeBadges}>
          {challengeState.activeChallenges.map((id) => {
            const plugin = challenges.find((c) => c.id === id);
            return plugin ? (
              <span key={id} className={styles.badge}>
                {plugin.icon} {plugin.name}
              </span>
            ) : null;
          })}
        </div>
        <button className={styles.stopButton} onClick={handleStopChallenge}>
          Exit Challenge
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3>Challenge Mode</h3>
      <div className={styles.challengeList}>
        {challenges.map((challenge) => {
          const isActive = challengeState.activeChallenges.includes(challenge.id);
          return (
            <button
              key={challenge.id}
              className={`${styles.challengeItem} ${isActive ? styles.active : ""}`}
              onClick={() => toggleChallenge(challenge.id)}
            >
              <span className={styles.icon}>{challenge.icon}</span>
              <span className={styles.name}>{challenge.name}</span>
              <span className={styles.description}>{challenge.description}</span>
            </button>
          );
        })}
      </div>
      {challengeState.activeChallenges.length > 0 && (
        <button className={styles.startButton} onClick={handleStartChallenge}>
          Start Challenge ({challengeState.activeChallenges.length})
        </button>
      )}
    </div>
  );
}
