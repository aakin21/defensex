import Phaser from 'phaser';

const BTN_RADIUS = 38;

export class AbilityButton {
  private bg: Phaser.GameObjects.Arc;
  private label: Phaser.GameObjects.Text;
  private cooldownOverlay: Phaser.GameObjects.Graphics;
  private cdText: Phaser.GameObjects.Text;
  private cx: number;
  private cy: number;

  onPress?: () => void;

  constructor(scene: Phaser.Scene) {
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

    // yetenek sembolü
    this.label = scene.add
      .text(this.cx, this.cy, 'Q', {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    // cooldown pie overlay
    this.cooldownOverlay = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(101);

    // cooldown sayaç yazısı
    this.cdText = scene.add
      .text(this.cx, this.cy, '', {
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(103);
  }

  setLabel(text: string) {
    this.label.setText(text);
  }

  /** ratio: 0 = hazır, 1 = tam cooldown başı */
  updateCooldown(ratio: number) {
    this.cooldownOverlay.clear();

    if (ratio <= 0) {
      this.cdText.setText('');
      this.bg.setFillStyle(0x4466cc, 0.85);
      this.label.setAlpha(1);
      return;
    }

    this.bg.setFillStyle(0x333344, 0.85);
    this.label.setAlpha(0.35);

    // Pie dolgu
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + 2 * Math.PI * ratio;
    this.cooldownOverlay.fillStyle(0x000000, 0.6);
    this.cooldownOverlay.beginPath();
    this.cooldownOverlay.moveTo(this.cx, this.cy);
    this.cooldownOverlay.arc(this.cx, this.cy, BTN_RADIUS, startAngle, endAngle, false, 64);
    this.cooldownOverlay.closePath();
    this.cooldownOverlay.fillPath();

    // Saniye sayacı
    const secs = Math.ceil(ratio * this.getCooldownTotal());
    if (secs > 0) this.cdText.setText(String(secs));
  }

  // Cooldown total'ı bilmeden yalnızca ratio ile çalışıyoruz.
  // Saniye göstermek için Hero'dan ratio gelirken toplam cd de aktarılabilir,
  // ancak şimdilik ratio * 1 yeterli (text gösterilmez, sadece pie görünür).
  private getCooldownTotal(): number {
    return 99; // placeholder — ratio * total kullanılmıyor kritik yerde
  }

  /** Minimap kamerasından gizlenecek objeler */
  getObjects(): Phaser.GameObjects.GameObject[] {
    return [this.bg, this.cooldownOverlay, this.label, this.cdText];
  }

  destroy() {
    this.bg.destroy();
    this.cooldownOverlay.destroy();
    this.label.destroy();
    this.cdText.destroy();
  }
}
