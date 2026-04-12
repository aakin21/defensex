import Phaser from 'phaser';
import type { HeroConfig, AbilityConfig } from './HeroConfig';
import { MapSystem } from '../systems/MapSystem';
import { MAP_WIDTH, MAP_HEIGHT } from '../systems/MapSystem';

const RESPAWN_TIME = 10000; // 10 saniye (ms)

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

  // Ability görselleri — world coords, container dışında
  private abilityRing!: Phaser.GameObjects.Graphics;
  private respawnText!: Phaser.GameObjects.Text;
  private respawnTimer = 0;

  private attackTimer = 0;
  private abilityCooldownRemaining = 0;
  private abilityActiveRemaining = 0;

  // callback'ler — GameScene tarafından atanır
  onAbilityUse?: (ability: AbilityConfig, hero: Hero) => void;
  onDeath?: (hero: Hero) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, config: HeroConfig, mapSystem: MapSystem) {
    super(scene, x, y);
    this.config = config;
    this.hp = config.maxHp;
    this.mapSystem = mapSystem;

    this.buildGraphics();

    // Dünya koordinatlarında (container dışı) objeler
    this.abilityRing = scene.add.graphics().setDepth(19);
    this.respawnText = scene.add
      .text(x, y - 50, '', {
        fontSize: '16px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(23)
      .setVisible(false);

    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(20);
  }

  private buildGraphics() {
    // gövde dairesi
    this.bodyShape = this.scene.add.arc(0, 0, 20, 0, 360, false, this.config.color, 1);

    // yön göstergesi (küçük üçgen sağda)
    this.dirIndicator = this.scene.add.triangle(22, 0, 0, -6, 10, 0, 0, 6, 0xffffff, 0.9);

    // HP bar (hero üstünde, container içinde sol-üst hizalı)
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
    let nearest: typeof enemies[0] | null = null;
    let nearestDist = Infinity;

    for (const e of enemies) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d <= range && d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }

    if (nearest) {
      nearest.takeDamage(this.config.damage * this.damageMultiplier);
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
    if (this.isDead || this.abilityCooldownRemaining > 0) return;
    this.abilityCooldownRemaining = this.config.ability.cooldown * 1000;
    this.abilityActiveRemaining = this.config.ability.duration * 1000;
    this.onAbilityUse?.(this.config.ability, this);
    this.playAbilityVisual();
  }

  private playAbilityVisual() {
    const ability = this.config.ability;

    if (ability.id === 'buyu_patlamasi') {
      // Anlık AoE flash
      const flash = this.scene.add.graphics().setDepth(25);
      flash.fillStyle(0xaa44ff, 0.5);
      flash.fillCircle(this.x, this.y, ability.radius);
      flash.lineStyle(3, 0xdd88ff, 1);
      flash.strokeCircle(this.x, this.y, ability.radius);
      this.scene.tweens.add({
        targets: flash, alpha: 0, scaleX: 1.3, scaleY: 1.3,
        duration: 500, ease: 'Cubic.Out',
        onComplete: () => flash.destroy(),
      });
    } else if (ability.id === 'kalkan_duvari') {
      this.bodyShape.setFillStyle(0x4488ff, 1);
    } else if (ability.id === 'ofke') {
      this.bodyShape.setFillStyle(0xff2200, 1);
    }
    // AoE halka (paladin, ranger, druid) update()'da çiziliyor
  }

  getAbilityCooldownRatio(): number {
    if (this.config.ability.cooldown === 0) return 0;
    return this.abilityCooldownRemaining / (this.config.ability.cooldown * 1000);
  }

  // ---- hasar & ölüm ----

  takeDamage(amount: number) {
    if (this.isDead || this.isShielded) return;
    this.hp = Math.max(0, this.hp - amount);

    // hasar flash
    this.bodyShape.setFillStyle(0xff4444, 1);
    this.scene.time.delayedCall(120, () => {
      if (!this.isDead) this.bodyShape.setFillStyle(this.config.color, 1);
    });

    if (this.hp === 0) this.die();
  }

  private die() {
    this.isDead = true;
    this.respawnTimer = RESPAWN_TIME;
    this.setAlpha(0.3);
    this.abilityRing.clear();
    this.onDeath?.(this);
  }

  private doRespawn() {
    this.isDead = false;
    this.hp = this.config.maxHp;
    this.isShielded = false;
    this.damageMultiplier = 1;
    this.speedMultiplier = 1;
    this.abilityRing.clear();
    this.respawnText.setVisible(false);
    this.bodyShape.setFillStyle(this.config.color, 1);

    // base yakınına respawn
    this.setPosition(MAP_WIDTH / 2, MAP_HEIGHT / 2 + 90);
    this.setAlpha(0);
    this.setScale(0.5);
    this.scene.tweens.add({
      targets: this,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 500, ease: 'Back.Out',
    });
  }

  // ---- güncelleme ----

  update(delta: number) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      const secs = Math.max(0, Math.ceil(this.respawnTimer / 1000));
      this.respawnText
        .setText(`Respawn: ${secs}s`)
        .setPosition(this.x, this.y - 50)
        .setVisible(true);
      if (this.respawnTimer <= 0) this.doRespawn();
      return;
    }

    this.respawnText.setVisible(false);

    // Cooldown sayaçları
    if (this.abilityCooldownRemaining > 0) {
      this.abilityCooldownRemaining = Math.max(0, this.abilityCooldownRemaining - delta);
    }
    if (this.abilityActiveRemaining > 0) {
      this.abilityActiveRemaining = Math.max(0, this.abilityActiveRemaining - delta);

      // AoE halka görselini hero pozisyonunda güncelle
      const ability = this.config.ability;
      if (ability.radius > 0 && ability.id !== 'buyu_patlamasi') {
        const ringColors: Record<string, number> = {
          kutsal_aura: 0xffdd44,
          ruzgar_kosusu: 0x44ffaa,
          doga_gucu: 0x66ff66,
        };
        const col = ringColors[ability.id] ?? 0xffffff;
        this.abilityRing.clear();
        this.abilityRing.lineStyle(2, col, 0.45);
        this.abilityRing.strokeCircle(this.x, this.y, ability.radius);
      }

      if (this.abilityActiveRemaining === 0) {
        this.onAbilityExpire();
      }
    } else {
      this.abilityRing.clear();
    }

    this.updateHpBar();
  }

  private onAbilityExpire() {
    this.isShielded = false;
    this.damageMultiplier = 1;
    this.speedMultiplier = 1;
    this.bodyShape.setFillStyle(this.config.color, 1);
    this.abilityRing.clear();
  }

  private updateHpBar() {
    this.hpBar.clear();
    const ratio = this.hp / this.config.maxHp;
    const w = 48, h = 5;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(0, 0, w, h);

    const barColor = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(0, 0, w * ratio, h);
  }

  /** Minimap kamerasından gizlenecek objeler */
  getDisplayObjects(): Phaser.GameObjects.GameObject[] {
    return [this.abilityRing, this.respawnText];
  }

  destroy(fromScene?: boolean) {
    this.abilityRing.destroy();
    this.respawnText.destroy();
    super.destroy(fromScene);
  }
}
