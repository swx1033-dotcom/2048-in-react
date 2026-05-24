import { useEffect, useState, useContext } from "react";
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
  const { boardSize } = useContext(GameContext);
  const isWideScreen = useMediaQuery({ minWidth: 512 });
  const containerWidth = isWideScreen
    ? containerWidthDesktop
    : containerWidthMobile;

  const [scale, setScale] = useState(1);
  const previousValue = usePreviousProps<number>(value);
  const hasChanged = previousValue !== value && !isObstacle;

  const positionToPixels = (pos: number) =>
    (pos / boardSize) * containerWidth;

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
    zIndex: isObstacle ? 999 : value,
  };

  const className = isObstacle
    ? `${styles.tile} ${styles.obstacle}`
    : `${styles.tile} ${styles[`tile${value}`]}`;

  return (
    <div className={className} style={style}>
      {!isObstacle && value}
    </div>
  );
}
