import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Tile as TileModel } from "@/models/tile";
import styles from "@/styles/board.module.css";
import Tile from "./tile";
import { GameContext } from "@/context/game-context";
import MobileSwiper, { SwipeInput } from "./mobile-swiper";
import Splash from "./splash";
import CircularProgress from "./circular-progress";
import { tournamentModeTimeLimit } from "@/constants";

export default function Board() {
  const { 
    getTiles, 
    moveTiles, 
    startGame, 
    status,
    isTournamentMode,
    timeLeft,
  } = useContext(GameContext);
  const initialized = useRef(false);
  const [gameStarted, setGameStarted] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // disables page scrolling with keyboard arrows
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
    [moveTiles],
  );

  const handleSwipe = useCallback(
    ({ deltaX, deltaY }: SwipeInput) => {
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
    [moveTiles],
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

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (initialized.current === false) {
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const progress = ((tournamentModeTimeLimit - timeLeft) / tournamentModeTimeLimit) * 100;

  return (
    <MobileSwiper onSwipe={handleSwipe}>
      <div className={styles.board}>
        {!gameStarted && <Splash heading="2048" showModeSelector={true} onPlay={handleStartGame} />}
        {gameStarted && status === "won" && <Splash heading="You won!" type="won" showModeSelector={false} />}
        {gameStarted && status === "lost" && <Splash heading="You lost!" showModeSelector={false} />}
        <div className={styles.tiles}>{renderTiles()}</div>
        <div className={styles.grid}>{renderGrid()}</div>
        {gameStarted && isTournamentMode && status === "ongoing" && (
          <div className={styles.timer}>
            <CircularProgress progress={progress} timeLeft={timeLeft} />
          </div>
        )}
      </div>
    </MobileSwiper>
  );
}
