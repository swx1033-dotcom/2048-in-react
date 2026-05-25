import { useCallback, useContext, useEffect, useRef } from "react";
import { Tile as TileModel } from "@/models/tile";
import styles from "@/styles/board.module.css";
import Tile from "./tile";
import { GameContext } from "@/context/game-context";
import MobileSwiper, { SwipeInput } from "./mobile-swiper";
import Splash from "./splash";
import TournamentTimer from "./tournament-timer";

export default function Board() {
  const {
    getTiles,
    moveTiles,
    startGame,
    status,
    gameMode,
    timerRemaining,
    timerProgress,
    tournamentStats,
  } = useContext(GameContext);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (status !== "ongoing") return;
      e.preventDefault();

      switch (e.code) {
        case "ArrowUp":
          moveTiles("move_up");
          break;
        case "ArrowDown":
          moveTiles("move_down");
          break;
        case "ArrowLeft":
          moveTiles("move_left");
          break;
        case "ArrowRight":
          moveTiles("move_right");
          break;
      }
    },
    [moveTiles, status],
  );

  const handleSwipe = useCallback(
    ({ deltaX, deltaY }: SwipeInput) => {
      if (status !== "ongoing") return;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          moveTiles("move_right");
        } else {
          moveTiles("move_left");
        }
      } else {
        if (deltaY > 0) {
          moveTiles("move_down");
        } else {
          moveTiles("move_up");
        }
      }
    },
    [moveTiles, status],
  );

  const renderGrid = () => {
    const cells: JSX.Element[] = [];
    const totalCellsCount = 16;

    for (let index = 0; index < totalCellsCount; index += 1) {
      cells.push(<div className={styles.cell} key={index} />);
    }

    return cells;
  };

  const renderTiles = () => {
    return getTiles().map((tile: TileModel) => (
      <Tile key={`${tile.id}`} {...tile} />
    ));
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const avgThinkTime =
    tournamentStats.moveCount > 0
      ? (tournamentStats.totalThinkTime / tournamentStats.moveCount / 1000).toFixed(2)
      : "0.00";

  return (
    <>
      {gameMode === "tournament" && status === "ongoing" && (
        <div className={styles.tournamentHud}>
          <TournamentTimer
            remaining={timerRemaining}
            progress={timerProgress}
          />
          <div className={styles.tournamentStats}>
            <span>Avg: {avgThinkTime}s</span>
            <span>Timeouts: {tournamentStats.timeoutCount}</span>
          </div>
        </div>
      )}
      <MobileSwiper onSwipe={handleSwipe}>
        <div className={styles.board}>
          {status === "idle" && <Splash type="idle" />}
          {status === "won" && <Splash heading="You won!" type="won" />}
          {status === "lost" && <Splash heading="You lost!" />}
          <div className={styles.tiles}>{renderTiles()}</div>
          <div className={styles.grid}>{renderGrid()}</div>
        </div>
      </MobileSwiper>
    </>
  );
}