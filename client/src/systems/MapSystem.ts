export const TILE_SIZE  = 64;
export const MAP_WIDTH  = 4096;
export const MAP_HEIGHT = 4096;
export const COLS = MAP_WIDTH  / TILE_SIZE; // 64
export const ROWS = MAP_HEIGHT / TILE_SIZE; // 64

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

    // Su: köşe blokları
    const waterCorners = [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 },
      { r: 0, c: COLS - 1 }, { r: 0, c: COLS - 2 }, { r: 1, c: COLS - 1 },
      { r: ROWS - 1, c: 0 }, { r: ROWS - 2, c: 0 }, { r: ROWS - 1, c: 1 },
      { r: ROWS - 1, c: COLS - 1 }, { r: ROWS - 1, c: COLS - 2 }, { r: ROWS - 2, c: COLS - 1 },
    ];
    for (const { r, c } of waterCorners) {
      data[r][c] = TerrainType.WATER;
    }

    // Geniş su bölgeleri — harita kenarlarında göl/nehir
    this.addLake(data, 8,  8,  5);
    this.addLake(data, 8,  55, 4);
    this.addLake(data, 55, 8,  4);
    this.addLake(data, 55, 55, 5);
    this.addLake(data, 32, 6,  3);
    this.addLake(data, 6,  32, 3);
    this.addLake(data, 32, 57, 3);
    this.addLake(data, 57, 32, 3);

    // Orman: 12 küme haritaya dağılmış
    const forestCenters = [
      { r: 6,  c: 14 }, { r: 6,  c: 48 },
      { r: 14, c: 6  }, { r: 14, c: 56 },
      { r: 22, c: 20 }, { r: 22, c: 44 },
      { r: 32, c: 12 }, { r: 32, c: 52 },
      { r: 42, c: 20 }, { r: 42, c: 44 },
      { r: 50, c: 6  }, { r: 50, c: 56 },
      { r: 58, c: 14 }, { r: 58, c: 48 },
    ];
    for (const { r: cr, c: cc } of forestCenters) {
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
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

    // Yollar: harita kenarlarından merkeze çapraz (col 31,32 ve row 31,32)
    const MID = Math.floor(COLS / 2);
    for (let r = 0; r < ROWS; r++) {
      if (data[r][MID - 1] !== TerrainType.WATER) data[r][MID - 1] = TerrainType.ROAD;
      if (data[r][MID]     !== TerrainType.WATER) data[r][MID]     = TerrainType.ROAD;
    }
    for (let c = 0; c < COLS; c++) {
      if (data[MID - 1][c] !== TerrainType.WATER) data[MID - 1][c] = TerrainType.ROAD;
      if (data[MID][c]     !== TerrainType.WATER) data[MID][c]     = TerrainType.ROAD;
    }

    // Harita ortası (base alanı) her zaman grass
    for (let r = MID - 4; r <= MID + 4; r++) {
      for (let c = MID - 4; c <= MID + 4; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          data[r][c] = TerrainType.GRASS;
        }
      }
    }

    return data;
  }

  private addLake(data: TerrainType[][], cr: number, cc: number, radius: number) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr * dr + dc * dc <= radius * radius) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            data[nr][nc] = TerrainType.WATER;
          }
        }
      }
    }
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
