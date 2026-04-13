import Phaser from 'phaser';

export type BotUnitType = 'Warrior' | 'Defender';

export interface BotUnitConfig {
  type: BotUnitType;
  displayName: string;
  color: number;
  cost: number;
  maxHp: number;
  damage: number;
  attackRange: number;
  attackSpeed: number;    // saniye
  patrolRadius: number;   // 0 = yerinden ayrılmaz
}

export const BOT_CONFIGS: Record<BotUnitType, BotUnitConfig> = {
  Warrior: {
    type: 'Warrior',
    displayName: 'Warrior Bot',
    color: 0xe08840,
    cost: 50,
    maxHp: 180,
    damage: 20,
    attackRange: 55,
    attackSpeed: 1.2,
    patrolRadius: 40,
  },
  Defender: {
    type: 'Defender',
    displayName: 'Defender Bot',
    color: 0x4488cc,
    cost: 75,
    maxHp: 300,
    damage: 10,
    attackRange: 50,
    attackSpeed: 1.5,
    patrolRadius: 0,
  },
};

export const BOT_TYPES = Object.keys(BOT_CONFIGS) as BotUnitType[];

const RESPAWN_NONE = -1;

export class BotUnit extends Phaser.GameObjects.Container {
  readonly botConfig: BotUnitConfig;
  hp: number;
  isDead = false;

  private bodyShape!: Phaser.GameObjects.Arc;
  private hpGfx!: Phaser.GameObjects.Graphics;
  private labelTxt!: Phaser.GameObjects.Text;

  // Patrol state (Warrior)
  private spawnX: number;
  private spawnY: number;
  private patrolTarget!: Phaser.Math.Vector2;
  private patrolTimer = 0;

  // Attack timer
  private attackTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BotUnitConfig) {
    super(scene, x, y);
    this.botConfig = config;
    this.hp = config.maxHp;
    this.spawnX = x;
    this.spawnY = y;

    if (config.patrolRadius > 0) {
      this.pickNewPatrolTarget();
    } else {
      this.patrolTarget = new Phaser.Math.Vector2(x, y);
    }

    this.buildGraphics();
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(18);
  }

  private buildGraphics() {
    // gövde
    this.bodyShape = this.scene.add.arc(0, 0, 16, 0, 360, false, this.botConfig.color, 1);

    // iç nokta (tür göstergesi)
    const inner = this.scene.add.arc(0, 0, 7, 0, 360, false, 0xffffff, 0.7);

    // HP bar
    this.hpGfx = this.scene.add.graphics();
    this.hpGfx.setPosition(-20, -26);

    // kısa etiket (W / D)
    this.labelTxt = this.scene.add.text(0, 0, this.botConfig.type === 'Warrior' ? 'W' : 'D', {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.add([this.bodyShape, inner, this.hpGfx, this.labelTxt]);
  }

  update(delta: number) {
    if (this.isDead) return;

    this.updateHpBar();

    if (this.attackTimer > 0) this.attackTimer -= delta;

    // Warrior patrol hareketi
    if (this.botConfig.patrolRadius > 0) {
      this.patrolTimer -= delta;
      const dx = this.patrolTarget.x - this.x;
      const dy = this.patrolTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5 || this.patrolTimer <= 0) {
        this.pickNewPatrolTarget();
      } else {
        const speed = 40; // px/sn (yavaş patrol)
        const dt = delta / 1000;
        this.x += (dx / dist) * speed * dt;
        this.y += (dy / dist) * speed * dt;
      }
    }
  }

  private pickNewPatrolTarget() {
    const r = this.botConfig.patrolRadius;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * r;
    this.patrolTarget = new Phaser.Math.Vector2(
      this.spawnX + Math.cos(angle) * dist,
      this.spawnY + Math.sin(angle) * dist,
    );
    this.patrolTimer = 2000 + Math.random() * 2000; // 2-4 sn
  }

  /** true dönerse saldırı tetiklendi */
  tryAttack(): boolean {
    if (this.isDead || this.attackTimer > 0) return false;
    this.attackTimer = this.botConfig.attackSpeed * 1000;
    this.showAttackFlash();
    return true;
  }

  takeDamage(amount: number) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.die();
  }

  private die() {
    this.isDead = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }

  private showAttackFlash() {
    this.bodyShape.setFillStyle(0xffffff, 1);
    this.scene.time.delayedCall(80, () => {
      if (!this.isDead) this.bodyShape.setFillStyle(this.botConfig.color, 1);
    });
  }

  private updateHpBar() {
    this.hpGfx.clear();
    const W = 40, H = 4;
    const frac = this.hp / this.botConfig.maxHp;
    this.hpGfx.fillStyle(0x222222, 0.8);
    this.hpGfx.fillRect(0, 0, W, H);
    this.hpGfx.fillStyle(frac > 0.5 ? 0x44ff44 : frac > 0.25 ? 0xffaa00 : 0xff3333, 1);
    this.hpGfx.fillRect(0, 0, W * frac, H);
  }

  destroy(fromScene?: boolean) {
    super.destroy(fromScene);
  }
}
