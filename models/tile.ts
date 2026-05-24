export type TileKind = "value" | "obstacle";

export type Tile = {
  id?: string;
  position: [number, number];
  value: number;
  kind?: TileKind;
};

export type TileMap = { [id: string]: Tile };

export const normalizeTile = (tile: Tile): Tile => ({
  ...tile,
  kind: tile.kind ?? "value",
});

export const isObstacleTile = (tile?: Tile) => tile?.kind === "obstacle";
