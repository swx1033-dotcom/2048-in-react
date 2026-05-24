export type Tile = {
  id?: string;
  position: [number, number];
  value: number;
  isObstacle?: boolean;
};

export type TileMap = { [id: string]: Tile };
