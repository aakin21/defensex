import Phaser from 'phaser';

// Duvar çizim önizleme sistemi — sürükle bırak
// BuildingSystem.drawWalls() ile entegre çalışır

export class WallDrawSystem {
  private scene: Phaser.Scene;
  private previewGfx: Phaser.GameObjects.Graphics;

  isDrawing = false;
  private startX = 0;
  private startY = 0;
  private endX = 0;
  private endY = 0;
  private activePointerId = -1;

  onDrawComplete?: (x1: number, y1: number, x2: number, y2: number) => void;
  onDrawCancel?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.previewGfx = scene.add.graphics().setDepth(50);
  }

  activate() {
    this.scene.input.on('pointerdown', this.onDown, this);
    this.scene.input.on('pointermove', this.onMove, this);
    this.scene.input.on('pointerup',   this.onUp,   this);
  }

  deactivate() {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup',   this.onUp,   this);
    this.previewGfx.clear();
    this.isDrawing = false;
    this.activePointerId = -1;
  }

  private onDown(ptr: Phaser.Input.Pointer) {
    if (this.activePointerId !== -1) return;
    this.activePointerId = ptr.id;
    this.isDrawing = true;
    const world = this.scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
    this.startX = world.x;
    this.startY = world.y;
    this.endX   = world.x;
    this.endY   = world.y;
  }

  private onMove(ptr: Phaser.Input.Pointer) {
    if (ptr.id !== this.activePointerId || !this.isDrawing) return;
    const world = this.scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
    this.endX = world.x;
    this.endY = world.y;
    this.drawPreview();
  }

  private onUp(ptr: Phaser.Input.Pointer) {
    if (ptr.id !== this.activePointerId) return;
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.activePointerId = -1;
    this.previewGfx.clear();

    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= 32) {
      this.onDrawComplete?.(this.startX, this.startY, this.endX, this.endY);
    } else {
      this.onDrawCancel?.();
    }
  }

  private drawPreview() {
    this.previewGfx.clear();

    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const segments = Math.floor(dist / 64);

    if (segments === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // her segment için dikdörtgen önizleme
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < segments; i++) {
      const cx = this.startX + nx * 64 * (i + 0.5);
      const cy = this.startY + ny * 64 * (i + 0.5);

      // döndürülmüş dikdörtgen
      const hw = 32; // half width
      const hh = 8;  // half height

      const corners = [
        { x: cx + cos * hw - sin * (-hh), y: cy + sin * hw + cos * (-hh) },
        { x: cx + cos * hw - sin * hh,    y: cy + sin * hw + cos * hh    },
        { x: cx - cos * hw - sin * hh,    y: cy - sin * hw + cos * hh    },
        { x: cx - cos * hw - sin * (-hh), y: cy - sin * hw + cos * (-hh) },
      ];

      this.previewGfx.fillStyle(0xffffff, 0.35);
      this.previewGfx.beginPath();
      this.previewGfx.moveTo(corners[0].x, corners[0].y);
      for (let j = 1; j < corners.length; j++) {
        this.previewGfx.lineTo(corners[j].x, corners[j].y);
      }
      this.previewGfx.closePath();
      this.previewGfx.fillPath();
    }

    // toplam uzunluk çizgisi
    this.previewGfx.lineStyle(1, 0xffffff, 0.5);
    this.previewGfx.beginPath();
    this.previewGfx.moveTo(this.startX, this.startY);
    this.previewGfx.lineTo(this.endX, this.endY);
    this.previewGfx.strokePath();
  }
}
