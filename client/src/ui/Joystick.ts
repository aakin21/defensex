import Phaser from 'phaser';

const BASE_RADIUS = 55;
const KNOB_RADIUS = 25;
const BASE_ALPHA  = 0.35;
const KNOB_ALPHA  = 0.7;

export class Joystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;

  private baseX: number;
  private baseY: number;
  private activePointerId = -1;

  dx = 0;
  dy = 0;
  isActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width, height } = scene.scale;
    this.baseX = 95;
    this.baseY = height - 120;

    this.base = scene.add
      .arc(this.baseX, this.baseY, BASE_RADIUS, 0, 360, false, 0xffffff, BASE_ALPHA)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    this.knob = scene.add
      .arc(this.baseX, this.baseY, KNOB_RADIUS, 0, 360, false, 0xffffff, KNOB_ALPHA)
      .setScrollFactor(0)
      .setDepth(101);

    // geniş dokunma alanı — sol yarı ekran
    const zone = scene.add
      .zone(0, 0, width / 2, height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(99)
      .setInteractive();

    zone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.activePointerId !== -1) return;
      this.activePointerId = ptr.id;
      this.isActive = true;
    });

    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.id !== this.activePointerId) return;
      this.updateKnob(ptr.x, ptr.y);
    });

    scene.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.id !== this.activePointerId) return;
      this.reset();
    });
  }

  private updateKnob(px: number, py: number) {
    const rawDx = px - this.baseX;
    const rawDy = py - this.baseY;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    const clamped = Math.min(dist, BASE_RADIUS);
    const angle   = Math.atan2(rawDy, rawDx);

    const kx = this.baseX + Math.cos(angle) * clamped;
    const ky = this.baseY + Math.sin(angle) * clamped;

    this.knob.setPosition(kx, ky);

    if (dist > 5) {
      this.dx = Math.cos(angle);
      this.dy = Math.sin(angle);
    } else {
      this.dx = 0;
      this.dy = 0;
    }
  }

  private reset() {
    this.activePointerId = -1;
    this.isActive = false;
    this.dx = 0;
    this.dy = 0;
    this.knob.setPosition(this.baseX, this.baseY);
  }
}
