import Phaser from 'phaser';
import type { HeroConfig, AbilityConfig } from './HeroConfig';
import { MapSystem } from '../systems/MapSystem';
import { MAP_WIDTH, MAP_HEIGHT } from '../systems/MapSystem';

const RESPAWN_TIME = 10000; // 10 saniye (ms)
const HP_REGEN_RATE = 0;    // şimdilik pasif regen yok

export class Hero extends Phaser.GameObjects.Container {
  readonly config: HeroConfig;

  hp: number;
  isDead = false;
  isShielded = false;       // Şövalye kalkan
  damageMultiplier = 1;     // Barbar öfke
  speedMultiplier = 1;      // Ranger rüzgar koşusu

  private mapSystem: MapSystem;
  private bodyShape!: Phaser.GameObjects.Arc;
  private dirIndicator!: Phaser.GameObjects.Triangle;
  private hpBar!: Phaser.GameObjects.Graphics;
  private nameTag!: Phaser.GameObjects.Text;

  private attackTimer = 0;
  private abilityCooldownRemaining = 0;
  private abilityActiveRemaining = 0;

  // callback — GameScene ability efektlerini server üzerinden yönetecek
  onAbilityUse?: (ability: AbilityConfig, hero: Hero) => void;
  onDeath?: (hero: Hero) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, config: HeroConfig, mapSystem: MapSystem) {
    super(scene, x, y);
    this.config = config;
    this.hp = config.maxHp;
    this.mapSystem = mapSystem;

    this.buildGraphics();
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(20);
  }

  private buildGraphics() {
    // gövde dairesi
    this.bodyShape = this.scene.add.arc(0, 0, 20, 0, 360, false, this.config.color, 1);

    // yön göstergesi
    this.dirIndicator = this.scene.add.triangle(22, 0, 0, -6, 10, 0, 0, 6, 0xffffff, 0.9);

    // HP bar (hero üstünde)
    this.hpBar = this.scene.add.graphics();
    this.hpBar.setPosition(-24, -34);

    // isim etiketi
    this.nameTag = this.scene.add.text(0, -44, this.config.displayName, {
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add([this.bodyShape, this.dirIndicator, this.hpBar, this.nameTag]);
  }

  // ---- hareket ----

  move(dx: number, dy: number, delta: number) {
    if (this.isDead) return;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = dx / len;
    const ny = dy / len;

    const terrainSpeed = this.mapSystem.getSpeedAt(this.x, this.y);
    const speed = this.config.speed * terrainSpeed * this.speedMultiplier;
    const dt = delta / 1000;

    const newX = Phaser.Math.Clamp(this.x + nx * speed * dt, 0, MAP_WIDTH);
    const newY = Phaser.Math.Clamp(this.y + ny * speed * dt, 0, MAP_HEIGHT);

    if (this.mapSystem.isPassable(newX, newY)) {
      this.x = newX;
      this.y = newY;
    }

    // yön göstergesini döndür
    const angle = Math.atan2(ny, nx) * (180 / Math.PI);
    this.dirIndicator.setAngle(angle);
  }

  // ---- saldırı ----

  tryAttack(enemies: { x: number; y: number; takeDamage: (n: number) => void }[], delta: number) {
    if (this.isDead) return;

    this.attackTimer -= delta;
    if (this.attackTimer > 0) return;

    const range = this.config.attackRange;
    let nearest: (typeof enemies)[0] | null = null;
    let nearestDist = Infinity;

    for (const e of enemies) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d <= range && d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }

    if (nearest) {
      const dmg = this.config.damage * this.damageMultiplier;
      nearest.takeDamage(dmg);
      this.attackTimer = this.config.attackSpeed * 1000;
      this.showAttackFlash();
    }
  }

  private showAttackFlash() {
    this.bodyShape.setFillStyle(0xffffff, 1);
    this.scene.time.delayedCall(80, () => {
      if (!this.isDead) this.bodyShape.setFillStyle(this.config.color, 1);
    });
  }

  // ---- yetenek ----

  useAbility() {
    if (this.isDead) return;
    if (this.abilityCooldownRemaining > 0) return;

    this.abilityCooldownRemaining = this.config.ability.cooldown * 1000;
    this.abilityActiveRemaining   = this.config.ability.duration * 1000;

    this.onAbilityUse?.(this.config.ability, this);
  }

  getAbilityCooldownRatio(): number {
    if (this.config.ability.cooldown === 0) return 0;
    return this.abilityCooldownRemaining / (this.config.ability.cooldown * 1000);
  }

  // ---- hasar & ölüm ----

  takeDamage(amount: number) {
    if (this.isDead || this.isShielded) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.die();
  }

  private die() {
    this.isDead = true;
    this.setAlpha(0.3);
    this.onDeath?.(this);

    this.scene.time.delayedCall(RESPAWN_TIME, () => this.respawn());
  }

  private respawn() {
    this.isDead = false;
    this.hp = this.config.maxHp;
    this.isShielded = false;
    this.damageMultiplier = 1;
    this.speedMultiplier = 1;
    this.setAlpha(1);
    this.bodyShape.setFillStyle(this.config.color, 1);
  }

  // ---- güncelleme ----

  update(delta: number) {
    // cooldown sayaçları
    if (this.abilityCooldownRemaining > 0) {
      this.abilityCooldownRemaining = Math.max(0, this.abilityCooldownRemaining - delta);
    }
    if (this.abilityActiveRemaining > 0) {
      this.abilityActiveRemaining = Math.max(0, this.abilityActiveRemaining - delta);
      if (this.abilityActiveRemaining === 0) {
        this.onAbilityExpire();
      }
    }

    this.updateHpBar();

    // HP regen — şimdilik kullanılmıyor (Paladin ability server-side yönetilecek)
    void HP_REGEN_RATE;
  }

  private onAbilityExpire() {
    // aktif efektleri sıfırla
    this.isShielded = false;
    this.damageMultiplier = 1;
    this.speedMultiplier = 1;
    this.bodyShape.setFillStyle(this.config.color, 1);
  }

  private updateHpBar() {
    this.hpBar.clear();
    const ratio = this.hp / this.config.maxHp;
    const w = 48;
    const h = 5;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(0, 0, w, h);

    const barColor = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(0, 0, w * ratio, h);
  }
}
