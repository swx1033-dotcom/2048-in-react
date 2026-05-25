import { GameContext } from "@/context/game-context";
import { useContext } from "react";
import GameStatusModal from "./GameStatusModal";

export default function Splash() {
  const { continueGame, startGame, status } = useContext(GameContext);

  if (status === "ongoing") {
    return null;
  }

  return (
    <GameStatusModal
      status={status}
      onRestart={startGame}
      onContinue={status === "won" ? continueGame : undefined}
    />
  );
}
