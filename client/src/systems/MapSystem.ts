export const TILE_SIZE = 64;
export const MAP_WIDTH = 2048;
export const MAP_HEIGHT = 2048;
export const COLS = MAP_WIDTH / TILE_SIZE;
export const ROWS = MAP_HEIGHT / TILE_SIZE;

export const TerrainType = {
  GRASS:  0,
  ROAD:   1,
  FOREST: 2,
  WATER:  3,
} as const;
export type TerrainType = typeof TerrainType[keyof typeof TerrainType];

export const TERRAIN_SPEED: Record<TerrainType, number> = {
  [TerrainType.GRASS]:  1.0,
  [TerrainType.ROAD]:   1.2,
  [TerrainType.FOREST]: 0.6,
  [TerrainType.WATER]:  0,
};

export const TERRAIN_COLOR: Record<TerrainType, number> = {
  [TerrainType.GRASS]:  0x4a7c59,
  [TerrainType.ROAD]:   0x9e8866,
  [TerrainType.FOREST]: 0x2d5016,
  [TerrainType.WATER]:  0x1a3a6c,
};

export class MapSystem {
  private mapData: TerrainType[][];

  constructor() {
    this.mapData = this.generateMap();
  }

  private generateMap(): TerrainType[][] {
    const data: TerrainType[][] = [];

    for (let r = 0; r < ROWS; r++) {
      data[r] = [];
      for (let c = 0; c < COLS; c++) {
        data[r][c] = TerrainType.GRASS;
      }
    }

    // su: köşe blokları
    const waterCorners = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 },
      { r: 0, c: COLS - 1 }, { r: 0, c: COLS - 2 }, { r: 1, c: COLS - 1 },
      { r: ROWS - 1, c: 0 }, { r: ROWS - 2, c: 0 }, { r: ROWS - 1, c: 1 },
      { r: ROWS - 1, c: COLS - 1 }, { r: ROWS - 1, c: COLS - 2 }, { r: ROWS - 2, c: COLS - 1 },
    ];
    for (const { r, c } of waterCorners) {
      data[r][c] = TerrainType.WATER;
    }

    // orman: 6 küme
    const forestCenters = [
      { r: 4, c: 6 },  { r: 4, c: 24 },
      { r: 14, c: 4 }, { r: 14, c: 27 },
      { r: 26, c: 7 }, { r: 26, c: 23 },
    ];
    for (const { r: cr, c: cc } of forestCenters) {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (data[nr][nc] !== TerrainType.WATER) {
              data[nr][nc] = TerrainType.FOREST;
            }
          }
        }
      }
    }

    // yol: harita kenarlarından merkeze (16,16) doğru çapraz yollar
    for (let r = 0; r < ROWS; r++) {
      if (data[r][15] !== TerrainType.WATER) data[r][15] = TerrainType.ROAD;
      if (data[r][16] !== TerrainType.WATER) data[r][16] = TerrainType.ROAD;
    }
    for (let c = 0; c < COLS; c++) {
      if (data[15][c] !== TerrainType.WATER) data[15][c] = TerrainType.ROAD;
      if (data[16][c] !== TerrainType.WATER) data[16][c] = TerrainType.ROAD;
    }

    // harita ortası (base alanı) her zaman grass
    for (let r = 13; r <= 18; r++) {
      for (let c = 13; c <= 18; c++) {
        data[r][c] = TerrainType.GRASS;
      }
    }

    return data;
  }

  getTerrain(worldX: number, worldY: number): TerrainType {
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return TerrainType.WATER;
    return this.mapData[row][col];
  }

  getSpeedAt(worldX: number, worldY: number): number {
    return TERRAIN_SPEED[this.getTerrain(worldX, worldY)];
  }

  isPassable(worldX: number, worldY: number): boolean {
    return this.getTerrain(worldX, worldY) !== TerrainType.WATER;
  }

  getData(): TerrainType[][] {
    return this.mapData;
  }
}
