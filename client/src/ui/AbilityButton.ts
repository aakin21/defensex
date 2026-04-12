import Phaser from 'phaser';

const BTN_RADIUS = 38;

export class AbilityButton {
  private scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Arc;
  private label: Phaser.GameObjects.Text;
  private cooldownOverlay: Phaser.GameObjects.Graphics;
  private cx: number;
  private cy: number;

  onPress?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width, height } = scene.scale;
    this.cx = width - 80;
    this.cy = height - 120;

    // arka plan
    this.bg = scene.add
      .arc(this.cx, this.cy, BTN_RADIUS, 0, 360, false, 0x4466cc, 0.85)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.bg.on('pointerdown', () => this.onPress?.());
    this.bg.on('pointerover', () => this.bg.setFillStyle(0x6688ee, 0.95));
    this.bg.on('pointerout',  () => this.bg.setFillStyle(0x4466cc, 0.85));

    // yetenek adı kısaltması
    this.label = scene.add.text(this.cx, this.cy, 'Q', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    // cooldown pie overlay
    this.cooldownOverlay = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(101);
  }

  setLabel(text: string) {
    this.label.setText(text);
  }

  // ratio: 0 = hazır, 1 = tam cooldown'da
  updateCooldown(ratio: number) {
    this.cooldownOverlay.clear();
    if (ratio <= 0) return;

    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + 2 * Math.PI * ratio;

    this.cooldownOverlay.fillStyle(0x000000, 0.6);
    this.cooldownOverlay.beginPath();
    this.cooldownOverlay.moveTo(this.cx, this.cy);
    this.cooldownOverlay.arc(this.cx, this.cy, BTN_RADIUS, startAngle, endAngle, false, 64);
    this.cooldownOverlay.closePath();
    this.cooldownOverlay.fillPath();
  }
}
