import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import {
  containerWidthMobile,
  containerWidthDesktop,
  mergeAnimationDuration,
  tileCountPerDimension,
} from "@/constants";
import { Tile as TileProps } from "@/models/tile";
import styles from "@/styles/tile.module.css";
import usePreviousProps from "@/hooks/use-previous-props";

type Props = TileProps & {
  animationsEnabled?: boolean;
};

export default function Tile({
  animationsEnabled = true,
  position,
  value,
}: Props) {
  const isWideScreen = useMediaQuery({ minWidth: 512 });
  const containerWidth = isWideScreen
    ? containerWidthDesktop
    : containerWidthMobile;

  const [scale, setScale] = useState(1);
  const previousValue = usePreviousProps<number>(value);
  const hasChanged = previousValue !== value;

  const positionToPixels = (positionValue: number) =>
    (positionValue / tileCountPerDimension) * containerWidth;

  useEffect(() => {
    if (!animationsEnabled) {
      setScale(1);
      return;
    }

    if (hasChanged) {
      setScale(1.1);
      const timeoutId = window.setTimeout(() => setScale(1), mergeAnimationDuration);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [animationsEnabled, hasChanged]);

  const style = {
    left: positionToPixels(position[0]),
    top: positionToPixels(position[1]),
    transform: `scale(${animationsEnabled ? scale : 1})`,
    zIndex: value,
  };

  return (
    <div
      className={`${styles.tile} ${styles[`tile${value}`]} ${
        !animationsEnabled ? styles.staticTile : ""
      }`}
      style={style}
    >
      {value}
    </div>
  );
}
