import { CSSProperties, useEffect, useState } from "react";
import { mergeAnimationDuration } from "@/constants";
import { Tile as TileProps } from "@/models/tile";
import styles from "@/styles/tile.module.css";
import usePreviousProps from "@/hooks/use-previous-props";

export default function Tile({ position, value, kind = "number" }: TileProps) {
  const [scale, setScale] = useState(1);
  const previousValue = usePreviousProps<number>(value);
  const hasChanged = previousValue !== value;

  useEffect(() => {
    if (hasChanged) {
      setScale(1.08);
      const timeoutId = window.setTimeout(() => setScale(1), mergeAnimationDuration);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [hasChanged]);

  const tileClassName =
    kind === "obstacle"
      ? styles.obstacle
      : styles[`tile${value}`] ?? styles.tileSuper;

  const style = {
    "--position-x": position[0],
    "--position-y": position[1],
    "--tile-scale": scale,
    zIndex: kind === "obstacle" ? 1 : value,
  } as CSSProperties;

  return (
    <div className={`${styles.tile} ${tileClassName}`} style={style}>
      {kind === "obstacle" ? "" : value}
    </div>
  );
}
