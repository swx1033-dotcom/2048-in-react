import Head from "next/head";
import Image from "next/image";
import Board from "@/components/board";
import Score from "@/components/score";
import styles from "@/styles/index.module.css";
import { useContext } from "react";
import { GameContext } from "@/context/game-context";

export default function Home() {
  const { startGame, boardSize, infiniteMode } = useContext(GameContext);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "infinite") {
      startGame(4, true);
    } else {
      startGame(parseInt(value, 10), false);
    }
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={infiniteMode ? "infinite" : boardSize.toString()} 
            onChange={handleModeChange}
            style={{ padding: '0.5rem', borderRadius: '4px' }}
          >
            <option value="4">4x4</option>
            <option value="5">5x5</option>
            <option value="6">6x6</option>
            <option value="infinite">Infinite Mode</option>
          </select>
          <Score />
        </div>
      </header>
      <main>
        <Board />
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
