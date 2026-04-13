import Phaser from 'phaser';
import type { EnemyType, EnemyStats } from '../../../shared/types';

// Düşman davranış durumları
type EnemyState = 'walk' | 'attack' | 'die';

// Şaman aura efekti için komşu düşmanlara erişim
export interface EnemyRef {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  healDirect(amount: number): void;
}

// Saldırı hedefi arayüzü (bina, hero, base)
export interface AttackTarget {
  x: number;
  y: number;
  takeDamage(amount: number): void;
  isDead?: boolean;
}

const COLORS: Record<EnemyType, number> = {
  Warrior: 0xcc2222,
  Runner:  0xff8800,
  Tank:    0x882200,
  Shaman:  0x8822cc,
};

const SIZES: Record<EnemyType, number> = {
  Warrior: 16,
  Runner:  12,
  Tank:    26,
  Shaman:  16,
};

// Görüş açısı: 120 derece, 300px menzil (GDD §10)
const SIGHT_RANGE  = 300;
const SIGHT_ANGLE  = 120; // derece — her iki yanda 60°
const ATTACK_RANGE = 40;  // px — hedefe yakın dövüş mesafesi
const SHAMAN_AURA_RADIUS = 75;
const SHAMAN_REGEN = 5;   // HP/sn komşu başına

export class Enemy extends Phaser.GameObjects.Container implements EnemyRef {
  readonly enemyType: EnemyType;
  readonly stats: EnemyStats;

  hp: number;
  maxHp: number;
  isDead = false;

  // Wave çarpanları (server tarafından gelecek, şimdilik 1)
  hpMult  = 1;
  dmgMult = 1;

  private enemyState: EnemyState = 'walk';
  private facingAngle = 0; // radyan

  private bodyShape!: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  private dirIndicator!: Phaser.GameObjects.Triangle;
  private hpBar!: Phaser.GameObjects.Graphics;
  private shamanaura!: Phaser.GameObjects.Arc | null;

  private attackTimer = 0;
  private currentTarget: AttackTarget | null = null;
  private dieTimer = 0;
  private shamanauraTimer = 0;

  onDie?: (e: Enemy) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    stats: EnemyStats,
  ) {
    super(scene, x, y);
    this.enemyType = type;
    this.stats     = stats;
    this.hp        = stats.maxHp;
    this.maxHp     = stats.maxHp;

    this.buildGraphics();
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(18);
  }

  private buildGraphics() {
    const color = COLORS[this.enemyType];
    const size  = SIZES[this.enemyType];

    if (this.enemyType === 'Tank') {
      this.bodyShape = this.scene.add.rectangle(0, 0, size * 2, size * 2, color, 1);
      (this.bodyShape as Phaser.GameObjects.Rectangle).setStrokeStyle(2, 0xffffff, 0.5);
    } else {
      this.bodyShape = this.scene.add.arc(0, 0, size, 0, 360, false, color, 1);
    }

    // yön göstergesi
    this.dirIndicator = this.scene.add.triangle(
      size + 6, 0, 0, -4, 8, 0, 0, 4, 0xffffff, 0.7,
    );

    // HP bar
    this.hpBar = this.scene.add.graphics();
    const hw = size + 4;
    this.hpBar.setPosition(-hw, -size - 10);

    // Şaman aura dairesi
    this.shamanaura = null;
    if (this.enemyType === 'Shaman') {
      this.shamanaura = this.scene.add.arc(
        0, 0, SHAMAN_AURA_RADIUS, 0, 360, false, 0x8822cc, 0.08,
      );
      this.shamanaura.setStrokeStyle(1, 0xaa44ff, 0.3);
    }

    const parts: Phaser.GameObjects.GameObject[] = [
      this.bodyShape, this.dirIndicator, this.hpBar,
    ];
    if (this.shamanaura) parts.push(this.shamanaura);
    this.add(parts);
  }

  // ─── Genel güncelleme ───────────────────────────────────────────────────────

  update(
    delta: number,
    targets: AttackTarget[],   // hero, bot, bina, base
    allEnemies: EnemyRef[],    // şaman regen için
    destX: number,             // hedef konum (base veya pathfinding noktası)
    destY: number,
  ) {
    if (this.isDead) {
      this.updateDie(delta);
      return;
    }

    // Şaman aura
    if (this.enemyType === 'Shaman') {
      this.updateShamanAura(delta, allEnemies);
    }

    // Görüş alanındaki en yakın hedefi bul
    const target = this.findTarget(targets);

    if (target && Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= ATTACK_RANGE) {
      this.enemyState = 'attack';
      this.currentTarget = target;
      this.updateAttack(delta);
    } else if (target) {
      // Hedefe doğru yürü
      this.enemyState = 'walk';
      this.currentTarget = target;
      this.moveToward(target.x, target.y, delta);
    } else {
      // Görüş dışı — base'e yürü
      this.enemyState = 'walk';
      this.currentTarget = null;
      this.moveToward(destX, destY, delta);
    }

    this.updateHpBar();
    this.updateVisuals();
  }

  // ─── Hareket ────────────────────────────────────────────────────────────────

  private moveToward(tx: number, ty: number, delta: number) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const speed = this.stats.moveSpeed * (delta / 1000);

    this.x += nx * speed;
    this.y += ny * speed;
    this.facingAngle = Math.atan2(ny, nx);
  }

  // ─── Hedef bulma (görüş konisi) ─────────────────────────────────────────────

  private findTarget(targets: AttackTarget[]): AttackTarget | null {
    let nearest: AttackTarget | null = null;
    let nearestDist = Infinity;

    for (const t of targets) {
      if (t.isDead) continue;
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > SIGHT_RANGE) continue;

      // Görüş açısı kontrolü
      const angleToTarget = Math.atan2(dy, dx);
      let diff = angleToTarget - this.facingAngle;
      // -π ile π arasına normalize et
      while (diff >  Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;

      const halfAngle = (SIGHT_ANGLE / 2) * (Math.PI / 180);
      if (Math.abs(diff) > halfAngle) continue;

      if (dist < nearestDist) {
        nearest = t;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  // ─── Saldırı ────────────────────────────────────────────────────────────────

  private updateAttack(delta: number) {
    this.attackTimer -= delta;
    if (this.attackTimer > 0) return;
    if (!this.currentTarget || this.currentTarget.isDead) return;

    const dmg = this.stats.damage * this.dmgMult;
    this.currentTarget.takeDamage(dmg);
    this.attackTimer = 1000; // 1sn sabit (GDD §combat)
    this.showAttackFlash();
  }

  private showAttackFlash() {
    this.bodyShape.setAlpha(0.4);
    this.scene.time.delayedCall(80, () => {
      if (!this.isDead) this.bodyShape.setAlpha(1);
    });
  }

  // ─── Şaman aura ─────────────────────────────────────────────────────────────

  private updateShamanAura(delta: number, allEnemies: EnemyRef[]) {
    this.shamanauraTimer -= delta;
    if (this.shamanauraTimer > 0) return;
    this.shamanauraTimer = 1000; // saniyede bir regen tick

    for (const e of allEnemies) {
      if (e === (this as unknown as EnemyRef)) continue;
      if (e.isDead) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d <= SHAMAN_AURA_RADIUS) {
        e.healDirect(SHAMAN_REGEN);
      }
    }
  }

  // EnemyRef arayüzünden — şaman aurası için
  healDirect(amount: number) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // ─── Hasar ──────────────────────────────────────────────────────────────────

  takeDamage(amount: number) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.bodyShape.setAlpha(0.5);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) this.bodyShape.setAlpha(1);
    });
    if (this.hp === 0) this.startDie();
  }

  private startDie() {
    this.isDead = true;
    this.state  = 'die';
    this.dieTimer = 600; // ms — ölüm animasyonu süresi
    this.onDie?.(this);
    // büyüyüp kaybol efekti
    this.scene.tweens.add({
      targets:  this,
      scaleX:   1.8,
      scaleY:   1.8,
      alpha:    0,
      duration: 500,
      ease:     'Cubic.Out',
      onComplete: () => super.destroy(),
    });
  }

  private updateDie(delta: number) {
    this.dieTimer -= delta;
  }

  // ─── Görsel güncellemeler ────────────────────────────────────────────────────

  private updateHpBar() {
    this.hpBar.clear();
    const size = SIZES[this.enemyType];
    const w = (size + 4) * 2;
    const ratio = this.hp / this.maxHp;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(0, 0, w, 4);

    const color = ratio > 0.5 ? 0xff4444 : ratio > 0.25 ? 0xff8800 : 0xff0000;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(0, 0, w * ratio, 4);
  }

  private updateVisuals() {
    const angleDeg = this.facingAngle * (180 / Math.PI);
    this.dirIndicator.setAngle(angleDeg);
  }
}
