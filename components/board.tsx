import { useCallback, useContext, useEffect, useRef } from "react";
import { Tile as TileModel } from "@/models/tile";
import styles from "@/styles/board.module.css";
import Tile from "./tile";
import { GameContext } from "@/context/game-context";
import MobileSwiper, { SwipeInput } from "./mobile-swiper";
import Splash from "./splash";
import { containerWidthMobile, containerWidthDesktop, tileCountPerDimension } from "@/constants";

export default function Board() {
  const { getTiles, moveTiles, startGame, status, challengeState } = useContext(GameContext);
  const initialized = useRef(false);

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

  const renderObstacles = () => {
    const isWideScreen = typeof window !== "undefined" && window.innerWidth >= 512;
    const containerWidth = isWideScreen
      ? containerWidthDesktop
      : containerWidthMobile;

    const positionToPixels = (position: number) =>
      (position / tileCountPerDimension) * containerWidth;

    const entries: string[] = Array.from(challengeState.obstaclePositions);
    return entries.map((key) => {
      const parts = key.split(",");
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);

      const style = {
        left: positionToPixels(x),
        top: positionToPixels(y),
      };

      return (
        <div
          key={`obs-${key}`}
          className={styles.obstacle}
          style={style}
        >
          &#9762;
        </div>
      );
    });
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
    <MobileSwiper onSwipe={handleSwipe}>
      <div className={styles.board}>
        {status === "won" && <Splash heading="You won!" type="won" />}
        {status === "lost" && <Splash heading="You lost!" />}
        <div className={styles.tiles}>
          {renderTiles()}
          {renderObstacles()}
        </div>
        <div className={styles.grid}>{renderGrid()}</div>
      </div>
    </MobileSwiper>
  );
}
