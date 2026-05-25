import { useCallback, useContext, useEffect, useRef } from "react";
import { Tile as TileModel } from "@/models/tile";
import styles from "@/styles/board.module.css";
import Tile from "./tile";
import { GameContext } from "@/context/game-context";
import MobileSwiper, { SwipeInput } from "./mobile-swiper";
import Splash from "./splash";

export default function Board() {
  const {
    getTiles,
    isDemoMode,
    moveTiles,
    startDemo,
    startGame,
    status,
    stopDemo,
  } = useContext(GameContext);
  const initialized = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isDemoMode) {
        if (e.code === "Escape") {
          e.preventDefault();
          stopDemo();
        }

        return;
      }

      if (
        e.code !== "ArrowUp" &&
        e.code !== "ArrowDown" &&
        e.code !== "ArrowLeft" &&
        e.code !== "ArrowRight"
      ) {
        return;
      }

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
    [isDemoMode, moveTiles, stopDemo],
  );

  const handleSwipe = useCallback(
    ({ deltaX, deltaY }: SwipeInput) => {
      if (isDemoMode) {
        return;
      }

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
    [isDemoMode, moveTiles],
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
    if (initialized.current === false) {
      startGame();
      initialized.current = true;
    }
  }, [startGame]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <MobileSwiper disabled={isDemoMode} onSwipe={handleSwipe}>
      <div className={styles.board}>
        {status === "ongoing" && (
          <div className={styles.controls}>
            <button
              className={styles.demoButton}
              onClick={isDemoMode ? stopDemo : () => startDemo()}
            >
              {isDemoMode ? "■ 停止演示" : "▶ 自动演示"}
            </button>
          </div>
        )}
        {status === "won" && <Splash heading="You won!" type="won" />}
        {status === "lost" && <Splash heading="You lost!" type="lost" />}
        {status === "ongoing" && isDemoMode && (
          <Splash heading="演示中…" type="demo" />
        )}
        <div className={styles.tiles}>{renderTiles()}</div>
        <div className={styles.grid}>{renderGrid()}</div>
      </div>
    </MobileSwiper>
  );
}
