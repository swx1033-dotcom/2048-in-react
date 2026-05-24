import { useContext, useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import {
  containerWidthMobile,
  containerWidthDesktop,
  mergeAnimationDuration,
} from "@/constants";
import { Tile as TileProps } from "@/models/tile";
import styles from "@/styles/tile.module.css";
import usePreviousProps from "@/hooks/use-previous-props";
import { GameContext } from "@/context/game-context";

export default function Tile({ position, value, isObstacle }: TileProps) {
  const isWideScreen = useMediaQuery({ minWidth: 512 });
  const containerWidth = isWideScreen
    ? containerWidthDesktop
    : containerWidthMobile;

  const { boardSize } = useContext(GameContext);
  const [scale, setScale] = useState(1);
  const previousValue = usePreviousProps<number>(value);
  const hasChanged = previousValue !== value;

  const positionToPixels = (position: number) =>
    (position / boardSize) * containerWidth;

  useEffect(() => {
    if (hasChanged) {
      setScale(1.1);
      setTimeout(() => setScale(1), mergeAnimationDuration);
    }
  }, [hasChanged]);

  const style = {
    left: positionToPixels(position[0]),
    top: positionToPixels(position[1]),
    transform: `scale(${scale})`,
    zIndex: value,
    width: `calc(var(--pixel-size) * ${isWideScreen ? 12.5 * 4 / boardSize : 8 * 4 / boardSize})`,
    height: `calc(var(--pixel-size) * ${isWideScreen ? 12.5 * 4 / boardSize : 8 * 4 / boardSize})`,
    fontSize: `calc(var(--pixel-size) * ${isWideScreen ? 6 * 4 / boardSize : 4 * 4 / boardSize})`,
    lineHeight: `calc(var(--pixel-size) * ${isWideScreen ? 12.5 * 4 / boardSize : 8 * 4 / boardSize})`,
    margin: `calc(var(--pixel-size) * ${isWideScreen ? 1 * 4 / boardSize : 0.5 * 4 / boardSize})`,
  };

  return (
    <div className={`${styles.tile} ${isObstacle ? styles.obstacle : styles[`tile${value}`]}`} style={style}>
      {isObstacle ? 'X' : value}
    </div>
  );
}
