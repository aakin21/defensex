// ─── Shared types — used by both server and client ───────────────────────

export type HeroType = 'Paladin' | 'Sövalye' | 'Barbar' | 'Ranger' | 'Büyücü' | 'Druid';

export type BotUnitType = 'Warrior' | 'Defender';

export type BuildingType = 'ArcherTower' | 'Mortar' | 'LaserTower' | 'Wall';

export type EnemyType = 'Warrior' | 'Runner' | 'Tank' | 'Shaman';

export type GamePhase = 'prep' | 'wave' | 'gameover';

// ─── Economy ───────────────────────────────────────────────────────────────

export const GOLD_START = 200;

export const GOLD_REWARDS: Record<EnemyType, number> = {
  Warrior: 5,
  Runner:  5,
  Tank:    15,
  Shaman:  10,
};

export const WAVE_BONUS_BASE = 50; // + waveNo * 10

// ─── Building stats ────────────────────────────────────────────────────────

export interface BuildingLevelStats {
  cost:        number;   // purchase / upgrade cost
  hp:          number;
  damage:      number;   // DPS for laser, per-shot otherwise
  range:       number;   // px
  fireRate:    number;   // seconds between shots (0 = continuous)
  aoeRadius?:  number;   // only Mortar
  slowFactor?: number;   // only LaserTower lv2+
  armorPen?:   boolean;  // only LaserTower lv3
}

export const BUILDING_STATS: Record<BuildingType, BuildingLevelStats[]> = {
  ArcherTower: [
    { cost: 80,  hp: 300, damage: 25,  range: 200, fireRate: 1.5 },
    { cost: 60,  hp: 450, damage: 40,  range: 220, fireRate: 1.2 },
    { cost: 80,  hp: 600, damage: 60,  range: 250, fireRate: 1.0 },
  ],
  Mortar: [
    { cost: 120, hp: 250, damage: 80,  range: 350, fireRate: 4.0, aoeRadius: 80 },
    { cost: 90,  hp: 375, damage: 120, range: 380, fireRate: 3.5, aoeRadius: 90 },
    { cost: 110, hp: 500, damage: 160, range: 420, fireRate: 3.0, aoeRadius: 100 },
  ],
  LaserTower: [
    { cost: 150, hp: 200, damage: 15, range: 180, fireRate: 0 },
    { cost: 100, hp: 300, damage: 25, range: 200, fireRate: 0, slowFactor: 0.6 },
    { cost: 130, hp: 400, damage: 40, range: 230, fireRate: 0, slowFactor: 0.6, armorPen: true },
  ],
  Wall: [
    { cost: 20, hp: 500, damage: 0, range: 0, fireRate: 0 },
    { cost: 15, hp: 900, damage: 0, range: 0, fireRate: 0 },
  ],
};

// ─── Hero stats ────────────────────────────────────────────────────────────

export interface HeroStats {
  maxHp:       number;
  moveSpeed:   number;   // px/s
  damage:      number;
  attackRange: number;   // px
  attackSpeed: number;   // seconds
  abilityCooldown: number; // seconds
}

export const HERO_STATS: Record<HeroType, HeroStats> = {
  Paladin:  { maxHp: 300, moveSpeed: 120, damage: 35, attackRange: 60,  attackSpeed: 1.2, abilityCooldown: 15 },
  Sövalye:  { maxHp: 420, moveSpeed:  90, damage: 55, attackRange: 70,  attackSpeed: 1.6, abilityCooldown: 20 },
  Barbar:   { maxHp: 250, moveSpeed: 130, damage: 50, attackRange: 65,  attackSpeed: 1.2, abilityCooldown: 18 },
  Ranger:   { maxHp: 180, moveSpeed: 180, damage: 20, attackRange: 55,  attackSpeed: 0.7, abilityCooldown: 15 },
  Büyücü:   { maxHp: 170, moveSpeed: 120, damage: 40, attackRange: 80,  attackSpeed: 1.4, abilityCooldown: 12 },
  Druid:    { maxHp: 220, moveSpeed: 125, damage: 25, attackRange: 58,  attackSpeed: 1.0, abilityCooldown: 20 },
};

// ─── Bot stats ─────────────────────────────────────────────────────────────

export interface BotStats {
  cost:         number;
  maxHp:        number;
  damage:       number;
  attackRange:  number;
  attackSpeed:  number;
  patrolRadius: number;
}

export const BOT_STATS: Record<BotUnitType, BotStats> = {
  Warrior:  { cost: 50,  maxHp: 180, damage: 20, attackRange: 55, attackSpeed: 1.2, patrolRadius: 40 },
  Defender: { cost: 75,  maxHp: 300, damage: 10, attackRange: 50, attackSpeed: 1.5, patrolRadius: 0  },
};

// ─── Enemy stats ───────────────────────────────────────────────────────────

export interface EnemyStats {
  maxHp:     number;
  moveSpeed: number;   // px/s base
  damage:    number;
  reward:    number;   // gold on kill
}

export const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  Warrior: { maxHp: 100, moveSpeed: 80,  damage: 20, reward: 5  },
  Runner:  { maxHp:  50, moveSpeed: 160, damage: 10, reward: 5  },
  Tank:    { maxHp: 500, moveSpeed:  40, damage: 60, reward: 15 },
  Shaman:  { maxHp: 200, moveSpeed:  80, damage: 30, reward: 10 },
};

// ─── Wave formula ──────────────────────────────────────────────────────────

export interface WaveComposition {
  warriors: number;
  runners:  number;
  tanks:    number;
  shamans:  number;
  hpMult:   number;
  dmgMult:  number;
}

export function getWaveComposition(waveNo: number): WaveComposition {
  return {
    warriors: 5 + waveNo * 3,
    runners:  2 + waveNo * 2,
    tanks:    Math.floor(waveNo / 3),
    shamans:  Math.floor(waveNo / 5),
    hpMult:   1 + waveNo * 0.1,
    dmgMult:  1 + waveNo * 0.08,
  };
}

// ─── Colyseus message types ────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'buy_building';  buildingType: BuildingType; x: number; y: number }
  | { type: 'upgrade_building'; buildingId: string }
  | { type: 'buy_bot';       botType: BotUnitType; x: number; y: number }
  | { type: 'hero_move';     dx: number; dy: number }
  | { type: 'hero_ability' }
  | { type: 'hero_attack';   targetId: string }
  | { type: 'quick_command'; cmd: string };

export type ServerMessage =
  | { type: 'notification'; msg: string }
  | { type: 'game_over';    wave: number }
  | { type: 'wave_start';   waveNo: number };

// ─── Map / terrain ─────────────────────────────────────────────────────────

export type TerrainType = 'grass' | 'road' | 'forest' | 'water';

export const TERRAIN_SPEED: Record<TerrainType, number> = {
  grass:  1.0,
  road:   1.2,
  forest: 0.6,
  water:  0,   // impassable
};

export const MAP_TILE_SIZE = 64;
export const MAP_COLS      = 32; // 2048 / 64
export const MAP_ROWS      = 32;

// ─── Misc ──────────────────────────────────────────────────────────────────

export const PREP_DURATION_MS = 30_000;
export const HERO_RESPAWN_MS  = 10_000;
export const BASE_MAX_HP      = 5_000;
export const BOT_LIMIT        = 10;
