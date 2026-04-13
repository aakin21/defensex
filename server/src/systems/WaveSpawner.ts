import { getWaveComposition, ENEMY_STATS, MAP_TILE_SIZE, MAP_COLS, MAP_ROWS } from '../../../shared/types';
import type { EnemyType } from '../../../shared/types';

type SpawnCallback = (type: EnemyType, x: number, y: number, hp: number) => void;

interface PendingSpawn {
  type:  EnemyType;
  x:     number;
  y:     number;
  hp:    number;
  delay: number; // ms before spawning
}

// ─── WaveSpawner ──────────────────────────────────────────────────────────

const MAP_W = MAP_COLS * MAP_TILE_SIZE; // 2048
const MAP_H = MAP_ROWS * MAP_TILE_SIZE;

export class WaveSpawner {
  private pending: PendingSpawn[] = [];
  private elapsed = 0;

  /** Called once per wave. Queues all spawns with staggered delays. */
  spawn(waveNo: number, callback: SpawnCallback) {
    const comp = getWaveComposition(waveNo);
    const list: { type: EnemyType; count: number }[] = [
      { type: 'Warrior', count: comp.warriors },
      { type: 'Runner',  count: comp.runners  },
      { type: 'Tank',    count: comp.tanks     },
      { type: 'Shaman',  count: comp.shamans   },
    ];

    let delayAcc = 0;
    for (const { type, count } of list) {
      for (let i = 0; i < count; i++) {
        const baseStats = ENEMY_STATS[type];
        const hp = Math.round(baseStats.maxHp * comp.hpMult);
        const { x, y } = this.randomEdgePoint();
        this.pending.push({ type, x, y, hp, delay: delayAcc });
        delayAcc += 300 + Math.random() * 400; // 0.3-0.7s between spawns
      }
    }

    // Sort by delay
    this.pending.sort((a, b) => a.delay - b.delay);
    this.elapsed = 0;
    this._callback = callback;
  }

  private _callback?: SpawnCallback;

  /** Should be called each tick with dt in ms. Triggers pending spawns. */
  tick(dt: number) {
    if (this.pending.length === 0 || !this._callback) return;
    this.elapsed += dt;

    while (this.pending.length > 0 && this.pending[0].delay <= this.elapsed) {
      const { type, x, y, hp } = this.pending.shift()!;
      this._callback(type, x, y, hp);
    }
  }

  hasPendingSpawns(): boolean {
    return this.pending.length > 0;
  }

  reset() {
    this.pending  = [];
    this.elapsed  = 0;
    this._callback = undefined;
  }

  /** Random spawn point on map edge, away from center base */
  private randomEdgePoint(): { x: number; y: number } {
    const edge = Math.floor(Math.random() * 4);
    const margin = 32;

    switch (edge) {
      case 0: return { x: margin + Math.random() * (MAP_W - margin * 2), y: margin };
      case 1: return { x: margin + Math.random() * (MAP_W - margin * 2), y: MAP_H - margin };
      case 2: return { x: margin, y: margin + Math.random() * (MAP_H - margin * 2) };
      default: return { x: MAP_W - margin, y: margin + Math.random() * (MAP_H - margin * 2) };
    }
  }
}
