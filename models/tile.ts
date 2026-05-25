export type Tile = {
  id?: string;
  position: [number, number];
  value: number;
  isObstacle?: boolean;
  decayCounter?: number;
};

export type TileMap = { [id: string]: Tile };
