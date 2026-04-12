import Phaser from 'phaser';
import { Building } from '../entities/Building';
import { WallSegment } from '../entities/WallSegment';
import type { BuildingType } from '../entities/BuildingConfig';
import { BUILDING_CONFIGS } from '../entities/BuildingConfig';
import { MapSystem, TerrainType, TILE_SIZE } from './MapSystem';
import { EconomySystem } from './EconomySystem';
import type { EnemyTarget } from '../entities/Building';

const BASE_RADIUS = 80; // bu yarıçap içine bina konulamaz (base koruması)
const BASE_X = 1024;
const BASE_Y = 1024;

export class BuildingSystem {
  private scene: Phaser.Scene;
  private mapSystem: MapSystem;
  private economy: EconomySystem;

  buildings: Building[] = [];
  walls: WallSegment[] = [];

  onPlaceFailed?: (reason: string) => void;

  constructor(scene: Phaser.Scene, mapSystem: MapSystem, economy: EconomySystem) {
    this.scene = scene;
    this.mapSystem = mapSystem;
    this.economy = economy;
  }

  // ---- placement doğrulama ----

  canPlaceAt(x: number, y: number, type: BuildingType): { ok: boolean; reason: string } {
    // su kontrolü
    if (!this.mapSystem.isPassable(x, y)) {
      return { ok: false, reason: 'Su üzerine bina koyulamaz' };
    }

    // base yakınına konamaz
    const distToBase = Phaser.Math.Distance.Between(x, y, BASE_X, BASE_Y);
    if (distToBase < BASE_RADIUS) {
      return { ok: false, reason: 'Base çok yakın' };
    }

    const cfg = BUILDING_CONFIGS[type];
    const halfSize = cfg.size / 2;

    // mevcut binalarla çakışma
    for (const b of this.buildings) {
      const bHalf = b.config.size / 2;
      const dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
      if (dist < halfSize + bHalf + 4) {
        return { ok: false, reason: 'Başka bir bina var' };
      }
    }

    // tile sınırları
    if (x < TILE_SIZE || x > 2048 - TILE_SIZE || y < TILE_SIZE || y > 2048 - TILE_SIZE) {
      return { ok: false, reason: 'Harita dışı' };
    }

    return { ok: true, reason: '' };
  }

  // ---- bina yerleştirme ----

  placeBuilding(x: number, y: number, type: BuildingType): Building | null {
    const cfg = BUILDING_CONFIGS[type];
    const cost = cfg.levels[0].upgradeCost;

    if (!this.economy.canAfford(cost)) {
      this.onPlaceFailed?.('Yetersiz altın');
      return null;
    }

    const check = this.canPlaceAt(x, y, type);
    if (!check.ok) {
      this.onPlaceFailed?.(check.reason);
      return null;
    }

    this.economy.spend(cost);
    const building = new Building(this.scene, x, y, cfg);
    building.onDestroyed = (b) => {
      this.buildings = this.buildings.filter(bld => bld !== b);
    };
    this.buildings.push(building);
    return building;
  }

  // ---- duvar çizme ----
  // Başlangıç ve bitiş worldspace koordinatları, döndürülen değer: yerleştirilen segment sayısı

  drawWalls(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const totalDist = Math.sqrt(dx * dx + dy * dy);

    if (totalDist < 32) return 0;

    const segLen = 64;
    const maxSegments = Math.floor(totalDist / segLen);
    if (maxSegments === 0) return 0;

    const costPerSeg = 20;
    const affordable = Math.min(maxSegments, Math.floor(this.economy.getGold() / costPerSeg));

    if (affordable === 0) {
      this.onPlaceFailed?.('Yetersiz altın');
      return 0;
    }

    if (affordable < maxSegments) {
      this.onPlaceFailed?.(`Altın yetersiz — sadece ${affordable} segment çizildi`);
    }

    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    const nx = dx / totalDist;
    const ny = dy / totalDist;

    let placed = 0;
    for (let i = 0; i < affordable; i++) {
      const t = (i + 0.5) / maxSegments;
      const wx = x1 + nx * segLen * (i + 0.5);
      const wy = y1 + ny * segLen * (i + 0.5);

      // su kontrolü
      if (!this.mapSystem.isPassable(wx, wy)) continue;

      this.economy.spend(costPerSeg);
      const seg = new WallSegment(this.scene, wx, wy, angleDeg);
      seg.onDestroyed = (w) => {
        this.walls = this.walls.filter(s => s !== w);
      };
      this.walls.push(seg);
      placed++;
      void t;
    }

    return placed;
  }

  // ---- upgrade ----

  upgradeBuilding(building: Building): boolean {
    if (!building.canUpgrade()) return false;
    const cost = building.getUpgradeCost();
    if (!this.economy.canAfford(cost)) {
      this.onPlaceFailed?.('Yetersiz altın');
      return false;
    }
    this.economy.spend(cost);
    building.upgrade();
    return true;
  }

  // ---- güncelleme ----

  update(delta: number, enemies: EnemyTarget[]) {
    for (const b of this.buildings) {
      b.update(delta, enemies);
    }
    for (const w of this.walls) {
      w.update();
    }
  }

  // minimap için pozisyon listesi
  getBuildingPositions(): { x: number; y: number }[] {
    return [
      ...this.buildings.map(b => ({ x: b.x, y: b.y })),
      ...this.walls.map(w => ({ x: w.x, y: w.y })),
    ];
  }
}
