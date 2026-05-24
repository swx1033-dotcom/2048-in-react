import { useContext, useState } from "react";
import { GameContext } from "@/context/game-context";
import { ChallengeConfig } from "@/models/challenge";
import { ChallengePlugin, ConfigField } from "@/challenge/types";

export default function ChallengePanel() {
  const {
    challengeConfigs,
    setChallengeConfig,
    availablePlugins,
    challengeState,
  } = useContext(GameContext);
  const [open, setOpen] = useState(false);

  if (availablePlugins.length === 0) return null;

  const hasActive =
    Object.values(challengeConfigs).some((c) => c.enabled) ||
    challengeState.countdownStarted;

  let countdownDisplay: string | null = null;
  if (
    challengeConfigs.countdown &&
    challengeConfigs.countdown.enabled &&
    challengeState.countdownStarted
  ) {
    const total = (challengeConfigs.countdown.totalSeconds as number) || 60;
    const remaining = challengeState.countdownSeconds;
    countdownDisplay = `${Math.ceil(remaining)}s`;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: 20 }}>
          {open ? "🔽" : "▶️"} Challenge Mode
        </span>
        {hasActive && (
          <span
            style={{
              background: "#ff4d4d",
              color: "#fff",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            ACTIVE
          </span>
        )}
        {countdownDisplay !== null && (
          <span
            style={{
              background:
                challengeState.countdownSeconds <= 10 ? "#ff0000" : "#ff9900",
              color: "#fff",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: "bold",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {countdownDisplay}
          </span>
        )}
      </div>
      {open && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {availablePlugins.map((plugin) => {
            const current =
              challengeConfigs[plugin.id] || plugin.defaultConfig;
            return (
              <ChallengeCard
                key={plugin.id}
                plugin={plugin}
                config={current}
                onChange={(c) => setChallengeConfig(plugin.id, c)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({
  plugin,
  config,
  onChange,
}: {
  plugin: ChallengePlugin;
  config: ChallengeConfig;
  onChange: (c: ChallengeConfig) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #444",
        borderRadius: 8,
        padding: 12,
        minWidth: 200,
        background: config.enabled ? "#1a1a2e" : "#111",
        borderColor: config.enabled ? "#ff4d4d" : "#444",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: 14 }}>
          {plugin.emoji} {plugin.name}
        </span>
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) =>
              onChange({ ...config, enabled: e.target.checked })
            }
          />
        </label>
      </div>
      {config.enabled && (
        <div>
          {plugin.configFields.map((field) => {
            const value = config[field.key] as string | number | boolean;
            return (
              <div
                key={field.key}
                style={{ marginBottom: 6, fontSize: 12 }}
              >
                <label style={{ display: "block", marginBottom: 2 }}>
                  {field.label}
                </label>
                {field.type === "slider" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step || 1}
                      value={value as number}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          enabled: true,
                          [field.key]: Number(e.target.value),
                        })
                      }
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: 30 }}>{String(value)}</span>
                  </div>
                ) : field.type === "toggle" ? (
                  <label style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          enabled: true,
                          [field.key]: e.target.checked,
                        })
                      }
                    />
                    {" "}
                    {field.label}
                  </label>
                ) : (
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={value as number}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        enabled: true,
                        [field.key]: Number(e.target.value),
                      })
                    }
                    style={{ width: "100%", padding: 4 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}