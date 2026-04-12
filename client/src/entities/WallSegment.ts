import Phaser from 'phaser';
import { BUILDING_CONFIGS } from './BuildingConfig';

const WALL_W = 64;
const WALL_H = 16;

export class WallSegment extends Phaser.GameObjects.Container {
  hp: number;
  level = 1;
  isDestroyed = false;
  readonly angle_deg: number; // derece cinsinden duvar açısı

  private bodyShape!: Phaser.GameObjects.Rectangle;
  private hpBar!: Phaser.GameObjects.Graphics;

  onDestroyed?: (w: WallSegment) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, angleDeg: number) {
    super(scene, x, y);
    this.angle_deg = angleDeg;
    this.hp = BUILDING_CONFIGS.Wall.levels[0].hp;

    this.buildGraphics();
    this.setRotation(Phaser.Math.DegToRad(angleDeg));
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(12);
  }

  private buildGraphics() {
    this.bodyShape = this.scene.add.rectangle(0, 0, WALL_W, WALL_H, 0xaaaaaa, 1);
    this.bodyShape.setStrokeStyle(1, 0xffffff, 0.5);

    this.hpBar = this.scene.add.graphics();
    this.hpBar.setPosition(-WALL_W / 2, -WALL_H / 2 - 6);

    this.add([this.bodyShape, this.hpBar]);
  }

  takeDamage(amount: number) {
    if (this.isDestroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    this.bodyShape.setFillStyle(0xff8888, 1);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDestroyed) this.bodyShape.setFillStyle(0xaaaaaa, 1);
    });
    if (this.hp === 0) this.destroyWall();
  }

  upgrade() {
    if (this.level >= 2) return;
    this.level = 2;
    this.hp = BUILDING_CONFIGS.Wall.levels[1].hp;
    this.bodyShape.setFillStyle(0xccccee, 1);
    this.bodyShape.setStrokeStyle(2, 0xffffff, 0.8);
  }

  private destroyWall() {
    this.isDestroyed = true;
    this.onDestroyed?.(this);
    super.destroy();
  }

  update() {
    this.hpBar.clear();
    const maxHp = BUILDING_CONFIGS.Wall.levels[this.level - 1].hp;
    const ratio = this.hp / maxHp;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(0, 0, WALL_W, 4);

    const color = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(0, 0, WALL_W * ratio, 4);
  }
}
