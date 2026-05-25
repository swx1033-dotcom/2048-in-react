import type { AppProps } from "next/app";
import ChallengeProvider from "@/context/challenge-context";
import GameProvider from "@/context/game-context";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChallengeProvider>
      <GameProvider>
        <Component {...pageProps} />
      </GameProvider>
    </ChallengeProvider>
  );
}
