import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import type { EnemyRef, AttackTarget } from '../entities/Enemy';
import type { EnemyType } from '../../../shared/types';
import { ENEMY_STATS, getWaveComposition } from '../../../shared/types';
import { EconomySystem } from './EconomySystem';

const MAP_W = 4096;
const MAP_H = 4096;
const BASE_X = MAP_W / 2;
const BASE_Y = MAP_H / 2;

// Harita kenarlarındaki spawn noktaları
const SPAWN_POINTS = [
  { x: MAP_W * 0.5,  y: 100       }, // kuzey
  { x: MAP_W * 0.25, y: 100       },
  { x: MAP_W * 0.75, y: 100       },
  { x: MAP_W - 100,  y: MAP_H * 0.5 }, // doğu
  { x: MAP_W - 100,  y: MAP_H * 0.25 },
  { x: MAP_W - 100,  y: MAP_H * 0.75 },
  { x: MAP_W * 0.5,  y: MAP_H - 100 }, // güney
  { x: MAP_W * 0.25, y: MAP_H - 100 },
  { x: MAP_W * 0.75, y: MAP_H - 100 },
  { x: 100,          y: MAP_H * 0.5 }, // batı
  { x: 100,          y: MAP_H * 0.25 },
  { x: 100,          y: MAP_H * 0.75 },
];

export class EnemySystem {
  private scene: Phaser.Scene;
  private economy: EconomySystem;

  enemies: Enemy[] = [];
  private spawnQueue: { type: EnemyType; hpMult: number; dmgMult: number }[] = [];
  private spawnTimer = 0;
  private readonly SPAWN_INTERVAL = 800; // ms arası spawn

  // Callback — wave bitti
  onWaveCleared?: () => void;
  private waveActive = false;

  constructor(scene: Phaser.Scene, economy: EconomySystem) {
    this.scene   = scene;
    this.economy = economy;
  }

  // ─── Wave başlatma ──────────────────────────────────────────────────────────

  startWave(waveNo: number) {
    const comp = getWaveComposition(waveNo);
    this.spawnQueue = [];

    for (let i = 0; i < comp.warriors; i++) this.spawnQueue.push({ type: 'Warrior', hpMult: comp.hpMult, dmgMult: comp.dmgMult });
    for (let i = 0; i < comp.runners;  i++) this.spawnQueue.push({ type: 'Runner',  hpMult: comp.hpMult, dmgMult: comp.dmgMult });
    for (let i = 0; i < comp.tanks;    i++) this.spawnQueue.push({ type: 'Tank',    hpMult: comp.hpMult, dmgMult: comp.dmgMult });
    for (let i = 0; i < comp.shamans;  i++) this.spawnQueue.push({ type: 'Shaman',  hpMult: comp.hpMult, dmgMult: comp.dmgMult });

    // Karıştır
    Phaser.Utils.Array.Shuffle(this.spawnQueue);

    this.spawnTimer  = 0;
    this.waveActive  = true;
  }

  // ─── Güncelleme ─────────────────────────────────────────────────────────────

  update(delta: number, targets: AttackTarget[]) {
    // Spawn kuyruğundan düşman çıkar
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnNext();
        this.spawnTimer = this.SPAWN_INTERVAL;
      }
    }

    // Tüm düşmanları güncelle
    const aliveRefs = this.enemies.filter(e => !e.isDead) as unknown as EnemyRef[];

    for (const e of this.enemies) {
      if (e.isDead) continue;
      e.update(delta, targets, aliveRefs, BASE_X, BASE_Y);
    }

    // Ölü düşmanları listeden çıkar (tween bitti mi kontrol)
    this.enemies = this.enemies.filter(e => e.active);

    // Wave bitti mi?
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      this.onWaveCleared?.();
    }
  }

  // ─── Spawn ──────────────────────────────────────────────────────────────────

  private spawnNext() {
    const item = this.spawnQueue.shift();
    if (!item) return;

    const spawnPt = Phaser.Utils.Array.GetRandom(SPAWN_POINTS) as { x: number; y: number };
    const baseStats = ENEMY_STATS[item.type];
    const scaledStats = {
      ...baseStats,
      maxHp:     Math.round(baseStats.maxHp     * item.hpMult),
      damage:    Math.round(baseStats.damage     * item.dmgMult),
    };

    const enemy = new Enemy(this.scene, spawnPt.x, spawnPt.y, item.type, scaledStats);
    enemy.hpMult  = item.hpMult;
    enemy.dmgMult = item.dmgMult;

    enemy.onDie = (e) => {
      this.economy.earn(e.stats.reward);
    };

    this.enemies.push(enemy);
  }

  // ─── Dışarıdan erişim ───────────────────────────────────────────────────────

  getAlive(): Enemy[] {
    return this.enemies.filter(e => !e.isDead);
  }

  getCount(): number {
    return this.spawnQueue.length + this.enemies.filter(e => !e.isDead).length;
  }

  clearAll() {
    for (const e of this.enemies) {
      if (!e.isDead) e.destroy();
    }
    this.enemies = [];
    this.spawnQueue = [];
    this.waveActive = false;
  }
}
