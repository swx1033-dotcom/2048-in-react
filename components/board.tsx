import { useCallback, useContext, useEffect } from "react";
import { tileCountPerDimension } from "@/constants";
import { Tile as TileModel } from "@/models/tile";
import styles from "@/styles/board.module.css";
import Tile from "./tile";
import { GameContext } from "@/context/game-context";
import MobileSwiper, { SwipeInput } from "./mobile-swiper";
import Splash from "./splash";

export default function Board() {
  const { getTiles, getObstacles, moveTiles, status } = useContext(GameContext);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
          e.preventDefault();
          moveTiles("move_up");
          break;
        case "ArrowDown":
          e.preventDefault();
          moveTiles("move_down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveTiles("move_left");
          break;
        case "ArrowRight":
          e.preventDefault();
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
      } else if (deltaY > 0) {
        moveTiles("move_down");
      } else {
        moveTiles("move_up");
      }
    },
    [moveTiles],
  );

  const renderGrid = () => {
    const cells: JSX.Element[] = [];
    const obstaclePositions = new Set(
      getObstacles().map((tile: TileModel) => `${tile.position[0]}:${tile.position[1]}`),
    );

    for (let y = 0; y < tileCountPerDimension; y += 1) {
      for (let x = 0; x < tileCountPerDimension; x += 1) {
        const cellKey = `${x}:${y}`;
        const cellClassName = obstaclePositions.has(cellKey)
          ? `${styles.cell} ${styles.obstacleCell}`
          : styles.cell;

        cells.push(<div className={cellClassName} key={cellKey} />);
      }
    }

    return cells;
  };

  const renderTiles = () => {
    return getTiles().map((tile: TileModel) => <Tile key={`${tile.id}`} {...tile} />);
  };

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
        <div className={styles.tiles}>{renderTiles()}</div>
        <div className={styles.grid}>{renderGrid()}</div>
      </div>
    </MobileSwiper>
  );
}
