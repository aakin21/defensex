import Phaser from 'phaser';
import { MapSystem, MAP_WIDTH, MAP_HEIGHT } from '../systems/MapSystem';

export interface HeroConfig {
  key: string;
  name: string;
  description: string;
  color: number;
  hp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackSpeed: number;   // saniye cinsinden iki vuruş arası
  abilityName: string;
  abilityCooldown: number;  // saniye
  abilityDuration: number;  // saniye (0 = anlık)
  abilityAoeRange: number;  // piksel (0 = AoE yok)
}

export const HERO_CONFIGS: HeroConfig[] = [
  {
    key: 'paladin',
    name: 'Paladin',
    description: 'Etraftaki dost birimlere HP regen sağlar',
    color: 0xf0e68c,
    hp: 300,
    speed: 120,
    attackDamage: 25,
    attackRange: 60,
    attackSpeed: 1.2,
    abilityName: 'Kutsal Aura',
    abilityCooldown: 15,
    abilityDuration: 3,
    abilityAoeRange: 150,
  },
  {
    key: 'knight',
    name: 'Şövalye',
    description: '4 sn boyunca hiç hasar almaz',
    color: 0x7eb8f7,
    hp: 450,
    speed: 80,
    attackDamage: 40,
    attackRange: 70,
    attackSpeed: 2.0,
    abilityName: 'Kalkan Duvarı',
    abilityCooldown: 20,
    abilityDuration: 4,
    abilityAoeRange: 0,
  },
  {
    key: 'barbar',
    name: 'Barbar',
    description: '5 sn boyunca 2x hasar verir',
    color: 0xe05c5c,
    hp: 200,
    speed: 110,
    attackDamage: 35,
    attackRange: 65,
    attackSpeed: 1.3,
    abilityName: 'Öfke',
    abilityCooldown: 18,
    abilityDuration: 5,
    abilityAoeRange: 0,
  },
  {
    key: 'ranger',
    name: 'Ranger',
    description: '200px çevredeki dostların hızını x1.5 yapar',
    color: 0x5cde89,
    hp: 120,
    speed: 200,
    attackDamage: 12,
    attackRange: 55,
    attackSpeed: 0.5,
    abilityName: 'Rüzgar Koşusu',
    abilityCooldown: 15,
    abilityDuration: 5,
    abilityAoeRange: 200,
  },
  {
    key: 'mage',
    name: 'Büyücü',
    description: '100px AoE anlık yüksek hasar',
    color: 0xb07ee0,
    hp: 120,
    speed: 110,
    attackDamage: 20,
    attackRange: 60,
    attackSpeed: 1.0,
    abilityName: 'Büyü Patlaması',
    abilityCooldown: 12,
    abilityDuration: 0,
    abilityAoeRange: 100,
  },
  {
    key: 'druid',
    name: 'Druid',
    description: '150px çevredeki dostların max HP\'ini %30 artırır',
    color: 0x7cc97c,
    hp: 200,
    speed: 120,
    attackDamage: 10,
    attackRange: 55,
    attackSpeed: 0.7,
    abilityName: 'Doğanın Gücü',
    abilityCooldown: 20,
    abilityDuration: 10,
    abilityAoeRange: 150,
  },
];

const RESPAWN_MS = 10_000;

export class Hero extends Phaser.Physics.Arcade.Sprite {
  private cfg: HeroConfig;
  private currentHp: number;
  private dead = false;
  private respawnTimer = 0;
  private attackTimer = 0;
  private abilityActive = false;
  private abilityTimer = 0;
  private invincible = false;
  private dmgMultiplier = 1;

  private hpBar!: Phaser.GameObjects.Graphics;
  private abilityRing!: Phaser.GameObjects.Graphics;
  private respawnText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, config: HeroConfig) {
    super(scene, x, y, config.key + '_hero');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cfg = config;
    this.currentHp = config.hp;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setCircle(20, 4, 4);
    this.setDepth(20);

    this.hpBar = scene.add.graphics().setDepth(21);
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
  }

  // ---- her frame çağrılır ----

  update(delta: number, _mapSystem: MapSystem) {
    if (this.dead) {
      this.respawnTimer -= delta;
      const secs = Math.max(0, Math.ceil(this.respawnTimer / 1000));
      this.respawnText
        .setText(`Respawn: ${secs}s`)
        .setPosition(this.x, this.y - 50)
        .setVisible(true);
      if (this.respawnTimer <= 0) this.doRespawn();
      this.hpBar.clear();
      this.abilityRing.clear();
      return;
    }

    this.respawnText.setVisible(false);
    this.drawHpBar();

    if (this.abilityActive) {
      this.abilityTimer -= delta;
      this.drawAbilityRing();
      if (this.abilityTimer <= 0) {
        this.abilityActive = false;
        this.invincible = false;
        this.dmgMultiplier = 1;
        this.abilityRing.clear();
      }
    }

    if (this.attackTimer > 0) this.attackTimer -= delta;
  }

  // ---- hareket ----

  move(dirX: number, dirY: number, magnitude: number, mapSystem: MapSystem) {
    if (this.dead) return;
    if (magnitude > 0.05) {
      const terrainMult = mapSystem.getSpeedAt(this.x, this.y);
      let speed = this.cfg.speed * terrainMult * magnitude;
      if (this.abilityActive && this.cfg.key === 'ranger') speed *= 1.5;
      this.setVelocity(dirX * speed, dirY * speed);
      if (Math.abs(dirX) > 0.1) this.setFlipX(dirX < 0);
    } else {
      this.setVelocity(0, 0);
    }
  }

  // ---- savaş ----

  takeDamage(amount: number) {
    if (this.dead || this.invincible) return;
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(120, () => this.clearTint());
    if (this.currentHp === 0) this.die();
  }

  heal(amount: number) {
    if (this.dead) return;
    this.currentHp = Math.min(this.cfg.hp, this.currentHp + amount);
  }

  /** true dönerse saldırı tetiklendi, hasar uygulanabilir */
  tryAutoAttack(): boolean {
    if (this.dead || this.attackTimer > 0) return false;
    this.attackTimer = this.cfg.attackSpeed * 1000;
    return true;
  }

  getEffectiveDamage(): number {
    return this.cfg.attackDamage * this.dmgMultiplier;
  }

  // ---- yetenek ----

  activateAbility(): boolean {
    if (this.dead || this.abilityActive) return false;

    switch (this.cfg.key) {
      case 'mage':
        // Anlık AoE: görsel flash, hasar server-side
        this.showMageFlash();
        return true;

      case 'knight':
        this.invincible = true;
        break;

      case 'barbar':
        this.dmgMultiplier = 2;
        break;
    }

    if (this.cfg.abilityDuration > 0) {
      this.abilityActive = true;
      this.abilityTimer = this.cfg.abilityDuration * 1000;
      this.drawAbilityRing();
    }
    return true;
  }

  // ---- ölüm / respawn ----

  private die() {
    this.dead = true;
    this.respawnTimer = RESPAWN_MS;
    this.setVelocity(0, 0);
    this.abilityRing.clear();

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.25,
      duration: 450,
      ease: 'Cubic.Out',
    });
  }

  private doRespawn() {
    this.dead = false;
    this.currentHp = this.cfg.hp;
    this.dmgMultiplier = 1;
    this.invincible = false;
    this.abilityActive = false;
    this.abilityRing.clear();
    this.clearTint();

    this.setPosition(MAP_WIDTH / 2, MAP_HEIGHT / 2 + 90);
    this.respawnText.setVisible(false);

    this.setAlpha(0);
    this.setScale(0.5);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.Out',
    });
  }

  // ---- görsel yardımcılar ----

  private drawHpBar() {
    this.hpBar.clear();
    const W = 40, H = 5;
    const bx = this.x - W / 2;
    const by = this.y - 34;
    const frac = this.currentHp / this.cfg.hp;

    this.hpBar.fillStyle(0x222222);
    this.hpBar.fillRect(bx, by, W, H);

    const col = frac > 0.5 ? 0x44ff44 : frac > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBar.fillStyle(col);
    this.hpBar.fillRect(bx, by, W * frac, H);
  }

  private drawAbilityRing() {
    this.abilityRing.clear();
    if (this.cfg.abilityAoeRange <= 0) return;

    const ringColor: Record<string, number> = {
      paladin: 0xffdd44,
      ranger: 0x44ffaa,
      druid: 0x66ff66,
    };
    const col = ringColor[this.cfg.key] ?? 0xffffff;
    this.abilityRing.lineStyle(2, col, 0.45);
    this.abilityRing.strokeCircle(this.x, this.y, this.cfg.abilityAoeRange);
  }

  private showMageFlash() {
    const flash = this.scene.add.graphics().setDepth(25);
    flash.fillStyle(0xaa44ff, 0.55);
    flash.fillCircle(this.x, this.y, this.cfg.abilityAoeRange);
    flash.lineStyle(3, 0xdd88ff, 1);
    flash.strokeCircle(this.x, this.y, this.cfg.abilityAoeRange);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });
  }

  // ---- getter'lar ----

  getConfig(): HeroConfig { return this.cfg; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isHeroDead(): boolean { return this.dead; }
  getAttackRange(): number { return this.cfg.attackRange; }

  getDisplayObjects(): Phaser.GameObjects.GameObject[] {
    return [this.hpBar, this.abilityRing, this.respawnText];
  }

  destroy(fromScene?: boolean) {
    this.hpBar.destroy();
    this.abilityRing.destroy();
    this.respawnText.destroy();
    super.destroy(fromScene);
  }
}
