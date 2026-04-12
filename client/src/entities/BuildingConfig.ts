export type BuildingType = 'ArrowTower' | 'Mortar' | 'LaserTower' | 'Wall';

export interface LevelStats {
  hp: number;
  damage: number;    // hasar/vuruş (Laser: hasar/sn)
  range: number;     // px
  fireRate: number;  // saniye (Laser için güncelleme aralığı)
  aoeRadius: number; // 0 = AoE yok
  upgradeCost: number; // bu seviyeye yükseltme maliyeti (L1 = satın alma)
}

export interface BuildingConfig {
  type: BuildingType;
  displayName: string;
  color: number;
  size: number;       // kare genişliği px
  isLaser: boolean;   // sürekli hasar mı
  levels: [LevelStats, LevelStats, LevelStats]; // L1, L2, L3 (duvar: L1, L2 — L3 aynı)
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  ArrowTower: {
    type: 'ArrowTower',
    displayName: 'Okçu Kulesi',
    color: 0x8b5e3c,
    size: 48,
    isLaser: false,
    levels: [
      { hp: 300, damage: 25, range: 200, fireRate: 1.5, aoeRadius: 0,  upgradeCost: 80 },
      { hp: 450, damage: 40, range: 220, fireRate: 1.2, aoeRadius: 0,  upgradeCost: 60 },
      { hp: 600, damage: 60, range: 250, fireRate: 1.0, aoeRadius: 0,  upgradeCost: 80 },
    ],
  },
  Mortar: {
    type: 'Mortar',
    displayName: 'Havan Topu',
    color: 0x555566,
    size: 52,
    isLaser: false,
    levels: [
      { hp: 250, damage: 80,  range: 350, fireRate: 4.0, aoeRadius: 80,  upgradeCost: 120 },
      { hp: 375, damage: 120, range: 380, fireRate: 3.5, aoeRadius: 90,  upgradeCost: 90 },
      { hp: 500, damage: 160, range: 420, fireRate: 3.0, aoeRadius: 100, upgradeCost: 110 },
    ],
  },
  LaserTower: {
    type: 'LaserTower',
    displayName: 'Lazer Kulesi',
    color: 0x2244cc,
    size: 44,
    isLaser: true,
    levels: [
      { hp: 200, damage: 15, range: 180, fireRate: 0.1, aoeRadius: 0, upgradeCost: 150 },
      { hp: 300, damage: 25, range: 200, fireRate: 0.1, aoeRadius: 0, upgradeCost: 100 },
      { hp: 400, damage: 40, range: 230, fireRate: 0.1, aoeRadius: 0, upgradeCost: 130 },
    ],
  },
  Wall: {
    type: 'Wall',
    displayName: 'Duvar',
    color: 0xaaaaaa,
    size: 16,
    isLaser: false,
    levels: [
      { hp: 500, damage: 0, range: 0, fireRate: 0, aoeRadius: 0, upgradeCost: 20 }, // 20/segment
      { hp: 900, damage: 0, range: 0, fireRate: 0, aoeRadius: 0, upgradeCost: 15 }, // +15/segment
      { hp: 900, damage: 0, range: 0, fireRate: 0, aoeRadius: 0, upgradeCost: 0  },
    ],
  },
};

export const WALL_SEGMENT_COST = 20; // altın/segment
export const WALL_UPGRADE_COST = 15; // altın/segment upgrade
