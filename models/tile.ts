export type GameMode = "4x4" | "5x5" | "6x6" | "infinite";

export type TileKind = "number" | "obstacle";

export type Tile = {
  id?: string;
  kind?: TileKind;
  position: [number, number];
  value: number;
};

export type TileMap = { [id: string]: Tile };
