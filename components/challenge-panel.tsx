import { useContext, useState } from "react";
import { GameContext } from "@/context/game-context";
import { ChallengePlugin } from "@/challenges";
import styles from "@/styles/challenge-panel.module.css";

export default function ChallengePanel() {
  const {
    availablePlugins,
    activeChallenges,
    enableChallenge,
    disableChallenge,
    undo,
    redo,
    canUndo,
    canRedo,
    getChallengeState,
  } = useContext(GameContext);

  const [showPanel, setShowPanel] = useState(false);

  const isActive = (pluginId: string) => {
    return activeChallenges.some((c) => c.pluginId === pluginId);
  };

  const toggleChallenge = (plugin: ChallengePlugin) => {
    if (isActive(plugin.id)) {
      disableChallenge(plugin.id);
    } else {
      enableChallenge(plugin);
    }
  };

  const renderChallengeInfo = () => {
    return activeChallenges.map((active) => {
      const plugin = availablePlugins.find((p) => p.id === active.pluginId);
      if (!plugin) return null;

      const state = getChallengeState(active.pluginId);
      let extraInfo = "";

      if (plugin.id === "countdown") {
        extraInfo = `Moves left: ${state.movesRemaining || active.config.maxMoves}`;
      }

      return (
        <div key={active.pluginId} className={styles.activeChallenge}>
          <span className={styles.activeChallengeName}>{plugin.name}</span>
          {extraInfo && (
            <span className={styles.activeChallengeInfo}>{extraInfo}</span>
          )}
        </div>
      );
    });
  };

  return (
    <div className={styles.challengePanelContainer}>
      <button
        className={styles.toggleButton}
        onClick={() => setShowPanel(!showPanel)}
      >
        {showPanel ? "▼ Challenges" : "▶ Challenges"}
      </button>

      {showPanel && (
        <div className={styles.panel}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Undo/Redo</h3>
            <div className={styles.buttonRow}>
              <button
                className={styles.actionButton}
                onClick={undo}
                disabled={!canUndo}
              >
                ← Undo
              </button>
              <button
                className={styles.actionButton}
                onClick={redo}
                disabled={!canRedo}
              >
                Redo →
              </button>
            </div>
          </div>

          {activeChallenges.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Active Challenges</h3>
              <div className={styles.activeChallengesList}>
                {renderChallengeInfo()}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Available Challenges</h3>
            <div className={styles.pluginsList}>
              {availablePlugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className={`${styles.pluginCard} ${
                    isActive(plugin.id) ? styles.pluginCardActive : ""
                  }`}
                >
                  <div className={styles.pluginHeader}>
                    <span className={styles.pluginName}>{plugin.name}</span>
                    <button
                      className={styles.togglePluginButton}
                      onClick={() => toggleChallenge(plugin)}
                    >
                      {isActive(plugin.id) ? "Disable" : "Enable"}
                    </button>
                  </div>
                  <p className={styles.pluginDescription}>{plugin.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
