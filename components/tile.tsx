import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { mergeAnimationDuration } from "@/constants";
import { Tile as TileProps } from "@/models/tile";
import styles from "@/styles/tile.module.css";
import usePreviousProps from "@/hooks/use-previous-props";

export default function Tile({
  position,
  value,
  isObstacle,
  boardSize = 4,
}: TileProps & { boardSize?: number }) {
  const isWideScreen = useMediaQuery({ minWidth: 512 });
  const containerWidth = isWideScreen ? boardSize * 116 : boardSize * 72;

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

  const tileClass = isObstacle
    ? `${styles.tile} ${styles.obstacle}`
    : `${styles.tile} ${styles[`tile${value}`]}`;

  const style = {
    left: positionToPixels(position[0]),
    top: positionToPixels(position[1]),
    transform: `scale(${scale})`,
    zIndex: isObstacle ? -1 : value,
  };

  return <div className={tileClass} style={style}>{isObstacle ? "" : value}</div>;
}