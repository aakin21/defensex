import Phaser from 'phaser';
import type { BuildingConfig, BuildingType } from './BuildingConfig';

export interface EnemyTarget {
  x: number;
  y: number;
  takeDamage: (amount: number, aoeRadius?: number) => void;
  isDead: boolean;
}

export class Building extends Phaser.GameObjects.Container {
  readonly buildingType: BuildingType;
  readonly config: BuildingConfig;

  hp: number;
  level = 1; // 1-3
  isDestroyed = false;

  // Laser: sürekli hedef takibi
  private laserTarget: EnemyTarget | null = null;
  private laserLine: Phaser.GameObjects.Graphics | null = null;

  private attackTimer = 0;
  private bodyShape!: Phaser.GameObjects.Rectangle;
  private hpBar!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private rangeCircle!: Phaser.GameObjects.Arc;

  onDestroyed?: (b: Building) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingConfig) {
    super(scene, x, y);
    this.buildingType = config.type;
    this.config = config;
    this.hp = config.levels[0].hp;

    this.buildGraphics();
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(15);
  }

  private get stats() {
    return this.config.levels[Math.min(this.level - 1, 2)];
  }

  private buildGraphics() {
    const s = this.config.size;

    // menzil dairesi — sadece seçilince görünür
    this.rangeCircle = this.scene.add.arc(0, 0, this.stats.range, 0, 360, false, 0xffffff, 0.08)
      .setVisible(false);

    // gövde
    this.bodyShape = this.scene.add.rectangle(0, 0, s, s, this.config.color, 1);
    this.bodyShape.setStrokeStyle(2, 0xffffff, 0.6);

    // etiket
    this.labelText = this.scene.add.text(0, 0, this.shortLabel(), {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // HP bar
    this.hpBar = this.scene.add.graphics();
    this.hpBar.setPosition(-s / 2, -s / 2 - 8);

    this.add([this.rangeCircle, this.bodyShape, this.labelText, this.hpBar]);

    // Laser çizgisi ayrı katmanda
    if (this.config.isLaser) {
      this.laserLine = this.scene.add.graphics().setDepth(16);
    }
  }

  private shortLabel(): string {
    const labels: Record<BuildingType, string> = {
      ArrowTower: '🏹',
      Mortar: '💣',
      LaserTower: '⚡',
      Wall: '▬',
    };
    return labels[this.buildingType];
  }

  // ---- seçim ----

  showRange(visible: boolean) {
    this.rangeCircle.setVisible(visible);
  }

  // ---- upgrade ----

  canUpgrade(): boolean {
    return this.level < (this.buildingType === 'Wall' ? 2 : 3);
  }

  getUpgradeCost(): number {
    if (!this.canUpgrade()) return 0;
    return this.config.levels[this.level].upgradeCost;
  }

  upgrade() {
    if (!this.canUpgrade()) return;
    this.level++;
    this.hp = Math.min(this.hp + (this.stats.hp - this.config.levels[this.level - 2].hp), this.stats.hp);
    this.rangeCircle.setRadius(this.stats.range);
    this.labelText.setText(this.shortLabel() + this.level);
    this.bodyShape.setFillStyle(
      Phaser.Display.Color.IntegerToColor(this.config.color).lighten(this.level * 10).color,
    );
  }

  // ---- hasar ----

  takeDamage(amount: number) {
    if (this.isDestroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flashDamage();
    if (this.hp === 0) this.destroy();
  }

  private flashDamage() {
    this.bodyShape.setFillStyle(0xff6666, 1);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDestroyed) this.bodyShape.setFillStyle(this.config.color, 1);
    });
  }

  destroy(fromScene?: boolean) {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.laserLine?.destroy();
    this.onDestroyed?.(this);
    super.destroy(fromScene);
  }

  // ---- saldırı ----

  update(delta: number, enemies: EnemyTarget[]) {
    this.updateHpBar();

    const alive = enemies.filter(e => !e.isDead);
    if (alive.length === 0) {
      this.laserLine?.clear();
      this.laserTarget = null;
      return;
    }

    if (this.config.isLaser) {
      this.updateLaser(delta, alive);
    } else {
      this.updateProjectile(delta, alive);
    }
  }

  private updateProjectile(delta: number, enemies: EnemyTarget[]) {
    this.attackTimer -= delta;
    if (this.attackTimer > 0) return;

    const target = this.findNearest(enemies);
    if (!target) return;

    target.takeDamage(this.stats.damage, this.stats.aoeRadius || undefined);
    this.attackTimer = this.stats.fireRate * 1000;
    this.showAttackEffect(target);
  }

  private updateLaser(delta: number, enemies: EnemyTarget[]) {
    // mevcut hedef ölmüşse sıfırla
    if (this.laserTarget?.isDead) this.laserTarget = null;

    if (!this.laserTarget) {
      this.laserTarget = this.findNearest(enemies);
    }

    if (!this.laserTarget) {
      this.laserLine?.clear();
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.laserTarget.x, this.laserTarget.y);
    if (dist > this.stats.range) {
      this.laserTarget = null;
      this.laserLine?.clear();
      return;
    }

    // hasar uygula
    this.attackTimer -= delta;
    if (this.attackTimer <= 0) {
      this.laserTarget.takeDamage(this.stats.damage * (delta / 1000));
      this.attackTimer = this.stats.fireRate * 1000;
    }

    // lazer çizgisi
    const color = this.level >= 3 ? 0xff4444 : this.level === 2 ? 0xaa44ff : 0x44aaff;
    this.laserLine?.clear();
    this.laserLine?.lineStyle(2, color, 0.9);
    this.laserLine?.beginPath();
    this.laserLine?.moveTo(this.x, this.y);
    this.laserLine?.lineTo(this.laserTarget.x, this.laserTarget.y);
    this.laserLine?.strokePath();
  }

  private findNearest(enemies: EnemyTarget[]): EnemyTarget | null {
    let nearest: EnemyTarget | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d <= this.stats.range && d < minDist) {
        nearest = e;
        minDist = d;
      }
    }
    return nearest;
  }

  private showAttackEffect(target: EnemyTarget) {
    // hızlı flash — gerçek animasyon Faz 5 sonrasında enemy sprite'ları gelince eklenir
    const gfx = this.scene.add.graphics().setDepth(25);
    gfx.fillStyle(0xffff00, 0.8);
    gfx.fillCircle(target.x, target.y, 8);
    this.scene.time.delayedCall(120, () => gfx.destroy());
  }

  private updateHpBar() {
    this.hpBar.clear();
    const s = this.config.size;
    const ratio = this.hp / this.stats.hp;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(0, 0, s, 5);

    const color = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(0, 0, s * ratio, 5);
  }
}
