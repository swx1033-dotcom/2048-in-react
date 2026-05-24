export type TileType = "normal" | "obstacle";

export type Tile = {
  id?: string;
  position: [number, number];
  value: number;
  type?: TileType;
  decayTimer?: number;
  mergedCount?: number;
};

export type TileMap = { [id: string]: Tile };
