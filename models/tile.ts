export type Tile = {
  id?: string;
  position: [number, number];
  value: number;
  isObstacle?: boolean;
};

export type TileMap = { [id: string]: Tile };

export type GameMode = "classic" | "infinite";

export type BoardSize = 4 | 5 | 6;

export type BoardConfig = {
  boardSize: number;
  mode: GameMode;
};
