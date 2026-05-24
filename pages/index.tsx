import Head from "next/head";
import Image from "next/image";
import { ChangeEvent, useContext } from "react";
import Board from "@/components/board";
import Score from "@/components/score";
import {
  ChallengeModeId,
  MoveDirection,
  challengeModeDefinitions,
  challengeModeOrder,
  moveDirectionLabels,
} from "@/constants";
import { GameContext } from "@/context/game-context";
import styles from "@/styles/index.module.css";

const formatCountdown = (timeRemainingMs: number | null) => {
  if (timeRemainingMs === null) {
    return "未启用";
  }

  const totalSeconds = Math.max(0, Math.ceil(timeRemainingMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

export default function Home() {
  const {
    replayGame,
    undoMove,
    canUndo,
    enabledModes,
    challengeConfig,
    disabledDirections,
    timeRemainingMs,
    setChallengeModeEnabled,
    updateChallengeModeConfig,
  } = useContext(GameContext);

  const handleToggleMode = (modeId: ChallengeModeId) => {
    setChallengeModeEnabled(modeId, !enabledModes[modeId]);
  };

  const handleConfigChange = (
    modeId: ChallengeModeId,
    field: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    updateChallengeModeConfig(modeId, field, Number(event.target.value));
  };

  return (
    <div className={styles.twenty48}>
      <Head>
        <title>Play 2048</title>
        <meta
          name="description"
          content="Fully-functional 2048 game built in NextJS and TypeScript. Including animations."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="apple-touch-icon.png"
        />
        <link rel="icon" type="image/png" sizes="32x32" href="favicon32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="favicon16.png" />
      </Head>
      <header>
        <h1>2048</h1>
        <Score />
      </header>
      <main className={styles.main}>
        <Board />
        <section className={styles.challengePanel}>
          <div className={styles.challengeHeader}>
            <div>
              <h2>Challenge Mode</h2>
              <p>模式可自由组合，修改开关或参数后会立即重开当前对局。</p>
            </div>
            <div className={styles.challengeActions}>
              <button onClick={undoMove} disabled={!canUndo} type="button">
                Undo
              </button>
              <button onClick={replayGame} type="button">
                Replay
              </button>
            </div>
          </div>
          <div className={styles.challengeSummary}>
            <div>
              <span>倒计时</span>
              <strong>{formatCountdown(timeRemainingMs)}</strong>
            </div>
            <div>
              <span>禁用方向</span>
              <strong>
                {disabledDirections.length > 0
                  ? disabledDirections
                      .map((direction: MoveDirection) => moveDirectionLabels[direction])
                      .join("、")
                  : "无"}
              </strong>
            </div>
          </div>
          <div className={styles.modeGrid}>
            {challengeModeOrder.map((modeId) => {
              const definition = challengeModeDefinitions[modeId];
              const modeConfig = challengeConfig[modeId] as Record<string, number>;
              const isEnabled = enabledModes[modeId];

              return (
                <section
                  className={`${styles.modeCard} ${isEnabled ? styles.modeCardActive : ""}`}
                  key={modeId}
                >
                  <label className={styles.modeToggle}>
                    <input
                      checked={isEnabled}
                      onChange={() => handleToggleMode(modeId)}
                      type="checkbox"
                    />
                    <span>{definition.label}</span>
                  </label>
                  <p>{definition.description}</p>
                  <div className={styles.modeControls}>
                    {definition.controls.map((control) => (
                      <label className={styles.modeControl} key={`${modeId}-${control.key}`}>
                        <span>{control.label}</span>
                        <input
                          disabled={!isEnabled}
                          max={control.max}
                          min={control.min}
                          onChange={(event) =>
                            handleConfigChange(modeId, control.key, event)
                          }
                          step={control.step}
                          type="number"
                          value={modeConfig[control.key]}
                        />
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </main>
      <div>
        <h2>🚀 Create your own game</h2>
        <p>
          Join my{" "}
          <a
            href="https://www.udemy.com/course/2048-in-react-and-nextjs/?referralCode=AC3FD6336BAB9C402106"
            target="_blank"
            rel="noopener"
          >
            Udemy course
          </a>{" "}
          and learn how to create the 2048 game from scratch.
        </p>
      </div>
      <footer>
        <div className={styles.socials}>
          <a
            href="https://github.com/mateuszsokola/2048-in-react"
            target="_blank"
            rel="noopener"
          >
            <Image
              src="social-github.svg"
              alt="2048-in-react on GitHub"
              width={32}
              height={32}
            />
          </a>
          <a href="https://twitter.com/msokola" target="_blank" rel="noopener">
            <Image
              src="social-twitter.svg"
              alt="Matéush on Twitter"
              width={32}
              height={32}
            />
          </a>
        </div>
        <div>Made with ❤️ by Matéush</div>
      </footer>
    </div>
  );
}
