import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Tile as TileModel } from "@/models/tile";
import styles from "@/styles/board.module.css";
import Tile from "./tile";
import { GameContext } from "@/context/game-context";
import MobileSwiper, { SwipeInput } from "./mobile-swiper";
import Splash from "./splash";

export default function Board() {
  const {
    getTiles,
    moveTiles,
    startGame,
    status,
    history,
    historyIndex,
    jumpToHistory,
    setPreviewMode,
  } = useContext(GameContext);
  const initialized = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [disableAnimation, setDisableAnimation] = useState(false);
  const previewTilesRef = useRef<TileModel[]>([]);

  const getPreviewTiles = useCallback(
    (index: number): TileModel[] => {
      if (index >= 0 && index < history.length) {
        const targetState = history[index];
        return targetState.tilesByIds.map((tileId: string) => targetState.tiles[tileId]);
      }
      return [];
    },
    [history],
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      setPreviewIndex(value);
      setDisableAnimation(true);
      setIsDragging(true);
      setPreviewMode(true);
      previewTilesRef.current = getPreviewTiles(value);
    },
    [getPreviewTiles, setPreviewMode],
  );

  const handleSliderStart = useCallback(() => {
    setIsDragging(true);
    setDisableAnimation(true);
    setPreviewMode(true);
  }, [setPreviewMode]);

  const handleSliderEnd = useCallback(() => {
    setIsDragging(false);
    setDisableAnimation(false);
    setPreviewMode(false);
    if (previewIndex >= 0) {
      jumpToHistory(previewIndex);
    }
    setPreviewIndex(-1);
  }, [previewIndex, jumpToHistory, setPreviewMode]);

  const displayTiles = isDragging ? previewTilesRef.current : getTiles();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
    return displayTiles.map((tile: TileModel) => (
      <Tile
        key={`${tile.id}`}
        {...tile}
        disableAnimation={disableAnimation}
      />
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

  const maxStep = history.length > 0 ? history.length : 1;
  const currentStep = isDragging ? previewIndex : historyIndex;

  return (
    <MobileSwiper onSwipe={handleSwipe}>
      <div className={styles.board}>
        {status === "won" && <Splash heading="You won!" type="won" />}
        {status === "lost" && <Splash heading="You lost!" />}
        <div className={styles.tiles}>{renderTiles()}</div>
        <div className={styles.grid}>{renderGrid()}</div>
      </div>
      {history.length > 0 && (
        <div className={styles.sliderContainer}>
          <input
            type="range"
            min={0}
            max={history.length - 1}
            value={currentStep}
            onChange={handleSliderChange}
            onMouseDown={handleSliderStart}
            onMouseUp={handleSliderEnd}
            onTouchStart={handleSliderStart}
            onTouchEnd={handleSliderEnd}
            className={styles.slider}
          />
          <div className={styles.sliderLabel}>
            {currentStep + 1} / {history.length}
          </div>
        </div>
      )}
    </MobileSwiper>
  );
}
