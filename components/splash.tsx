import { useContext } from "react";
import { GameContext } from "@/context/game-context";
import GameStatusModal from "./GameStatusModal";

export default function Splash() {
  const { status } = useContext(GameContext);

  if (status === "ongoing") {
    return null;
  }

  return <GameStatusModal status={status} />;
}
