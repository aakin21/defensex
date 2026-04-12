import Phaser from 'phaser';

const BTN_R = 42;

export class AbilityButton {
  private bg: Phaser.GameObjects.Graphics;
  private cdOverlay: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Text;
  private cdLabel: Phaser.GameObjects.Text;
  private readonly cx: number;
  private readonly cy: number;
  private cdTotalMs: number;
  private cdLeftMs = 0;
  private onCooldown = false;
  private onActivate: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    abilityName: string,
    cooldownSec: number,
    onActivate: () => void,
  ) {
    this.cx = x;
    this.cy = y;
    this.cdTotalMs = cooldownSec * 1000;
    this.onActivate = onActivate;

    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.cdOverlay = scene.add.graphics().setScrollFactor(0).setDepth(101);
    this.icon = scene.add
      .text(x, y, '✦', { fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);
    this.cdLabel = scene.add
      .text(x, y, '', {
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(103);

    // yetenek adı (alt etiket)
    scene.add
      .text(x, y + BTN_R + 14, abilityName, { fontSize: '10px', color: '#cccccc' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.drawBg(false);

    scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const dx = ptr.x - this.cx;
      const dy = ptr.y - this.cy;
      if (Math.sqrt(dx * dx + dy * dy) <= BTN_R && !this.onCooldown) {
        this.triggerAbility();
      }
    });
  }

  private triggerAbility() {
    const triggered = this.onActivate();
    // onActivate bir boolean döndürmüyor şu an, ama gelecekte dönebilir
    void triggered;
    this.onCooldown = true;
    this.cdLeftMs = this.cdTotalMs;
    this.drawBg(true);
    this.icon.setAlpha(0.35);
  }

  private drawBg(cooling: boolean) {
    this.bg.clear();
    this.bg.fillStyle(cooling ? 0x444444 : 0xcc8800, 1);
    this.bg.fillCircle(this.cx, this.cy, BTN_R);
    this.bg.lineStyle(2, 0xffffff, 0.7);
    this.bg.strokeCircle(this.cx, this.cy, BTN_R);
  }

  update(delta: number) {
    if (!this.onCooldown) return;
    this.cdLeftMs -= delta;

    const frac = Math.max(0, this.cdLeftMs / this.cdTotalMs);
    this.cdOverlay.clear();
    if (frac > 0) {
      this.cdOverlay.fillStyle(0x000000, 0.55);
      this.cdOverlay.slice(
        this.cx, this.cy, BTN_R,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * frac),
        true,
      );
      this.cdOverlay.fillPath();
      this.cdLabel.setText(String(Math.ceil(this.cdLeftMs / 1000)));
    }

    if (this.cdLeftMs <= 0) {
      this.onCooldown = false;
      this.cdOverlay.clear();
      this.cdLabel.setText('');
      this.drawBg(false);
      this.icon.setAlpha(1);
    }
  }

  getObjects(): Phaser.GameObjects.GameObject[] {
    return [this.bg, this.cdOverlay, this.icon, this.cdLabel];
  }

  destroy() {
    this.bg.destroy();
    this.cdOverlay.destroy();
    this.icon.destroy();
    this.cdLabel.destroy();
  }
}
