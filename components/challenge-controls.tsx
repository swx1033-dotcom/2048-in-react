import { useContext } from "react";
import { GameContext } from "@/context/game-context";

export default function ChallengeControls() {
  const { challengeState, updateConfig, undo, redo } = useContext(GameContext) as any;

  if (!challengeState?.config) return null;

  const toggleConfig = (key: string) => {
    updateConfig({
      [key]: {
        ...challengeState.config[key],
        enabled: !challengeState.config[key].enabled,
      },
    });
  };

  const setConfigVal = (key: string, field: string, val: any) => {
    updateConfig({
      [key]: {
        ...challengeState.config[key],
        [field]: val,
      },
    });
  };

  return (
    <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "8px", background: "var(--background-color)" }}>
      <h3>Challenge Modes 🏆</h3>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {/* Obstacle Mode */}
        <div style={{ border: "1px solid #eee", padding: "8px", borderRadius: "4px" }}>
          <label>
            <input 
              type="checkbox" 
              checked={challengeState.config.obstacle.enabled} 
              onChange={() => toggleConfig("obstacle")} 
            />
            🪨 Obstacles
          </label>
          {challengeState.config.obstacle.enabled && (
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Frequency: 
              <input 
                type="number" 
                min={1} 
                max={5}
                value={challengeState.config.obstacle.frequency} 
                onChange={(e) => setConfigVal("obstacle", "frequency", parseInt(e.target.value) || 1)}
                style={{ width: "40px", marginLeft: "4px" }}
              />
            </div>
          )}
        </div>

        {/* Decay Mode */}
        <div style={{ border: "1px solid #eee", padding: "8px", borderRadius: "4px" }}>
          <label>
            <input 
              type="checkbox" 
              checked={challengeState.config.decay.enabled} 
              onChange={() => toggleConfig("decay")} 
            />
            📉 Tile Decay
          </label>
        </div>

        {/* Merge Limit Mode */}
        <div style={{ border: "1px solid #eee", padding: "8px", borderRadius: "4px" }}>
          <label>
            <input 
              type="checkbox" 
              checked={challengeState.config.mergeLimit.enabled} 
              onChange={() => toggleConfig("mergeLimit")} 
            />
            🚫 Merge Limit
          </label>
          {challengeState.config.mergeLimit.enabled && (
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Max per move: 
              <input 
                type="number" 
                min={0} 
                max={5}
                value={challengeState.config.mergeLimit.limit} 
                onChange={(e) => setConfigVal("mergeLimit", "limit", parseInt(e.target.value) || 0)}
                style={{ width: "40px", marginLeft: "4px" }}
              />
            </div>
          )}
        </div>

        {/* Disable Direction */}
        <div style={{ border: "1px solid #eee", padding: "8px", borderRadius: "4px" }}>
          <label>
            <input 
              type="checkbox" 
              checked={challengeState.config.disableDirection.enabled} 
              onChange={() => toggleConfig("disableDirection")} 
            />
            🧭 Random Block Dir
          </label>
          {challengeState.config.disableDirection.enabled && (
            <div style={{ fontSize: "12px", marginTop: "4px", color: "red" }}>
              Blocked: {challengeState.disabledDirection?.replace("move_", "") || "None"}
            </div>
          )}
        </div>

        {/* Countdown */}
        <div style={{ border: "1px solid #eee", padding: "8px", borderRadius: "4px" }}>
          <label>
            <input 
              type="checkbox" 
              checked={challengeState.config.countdown.enabled} 
              onChange={() => toggleConfig("countdown")} 
            />
            ⏳ Countdown
          </label>
          {challengeState.config.countdown.enabled && (
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Time Left: <strong style={{ color: challengeState.timeLeft <= 10 ? "red" : "inherit" }}>{challengeState.timeLeft ?? challengeState.config.countdown.duration}s</strong>
              <br/>
              Initial: 
              <input 
                type="number" 
                min={10} 
                value={challengeState.config.countdown.duration} 
                onChange={(e) => setConfigVal("countdown", "duration", parseInt(e.target.value) || 60)}
                style={{ width: "50px", marginLeft: "4px" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}