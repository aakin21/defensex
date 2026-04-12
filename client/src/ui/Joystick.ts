import Phaser from 'phaser';

const RADIUS = 65;
const STICK_R = 28;

export class Joystick {
  private base: Phaser.GameObjects.Graphics;
  private stick: Phaser.GameObjects.Graphics;
  private readonly cx: number;
  private readonly cy: number;
  private direction = new Phaser.Math.Vector2(0, 0);
  private magnitude = 0;
  private pointerId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.cx = x;
    this.cy = y;

    this.base = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.stick = scene.add.graphics().setScrollFactor(0).setDepth(101);
    this.drawBase();
    this.drawStick(0, 0);

    scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.pointerId !== -1) return;
      if (ptr.x < scene.scale.width / 2) {
        this.pointerId = ptr.id;
      }
    });

    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.id !== this.pointerId) return;
      const dx = ptr.x - this.cx;
      const dy = ptr.y - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.01) return;

      this.direction.set(dx / dist, dy / dist);
      this.magnitude = Math.min(dist / RADIUS, 1);
      const clamped = Math.min(dist, RADIUS);
      this.drawStick((dx / dist) * clamped, (dy / dist) * clamped);
    });

    scene.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.id !== this.pointerId) return;
      this.pointerId = -1;
      this.direction.set(0, 0);
      this.magnitude = 0;
      this.drawStick(0, 0);
    });
  }

  private drawBase() {
    this.base.clear();
    this.base.fillStyle(0xffffff, 0.10);
    this.base.fillCircle(this.cx, this.cy, RADIUS);
    this.base.lineStyle(2, 0xffffff, 0.30);
    this.base.strokeCircle(this.cx, this.cy, RADIUS);
  }

  private drawStick(ox: number, oy: number) {
    this.stick.clear();
    this.stick.fillStyle(0xffffff, 0.55);
    this.stick.fillCircle(this.cx + ox, this.cy + oy, STICK_R);
  }

  getDirection(): Phaser.Math.Vector2 { return this.direction; }
  getMagnitude(): number { return this.magnitude; }
  isActive(): boolean { return this.pointerId !== -1; }

  getObjects(): Phaser.GameObjects.GameObject[] {
    return [this.base, this.stick];
  }

  destroy() {
    this.base.destroy();
    this.stick.destroy();
  }
}
