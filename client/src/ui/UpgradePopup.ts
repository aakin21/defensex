import Phaser from 'phaser';
import type { Building } from '../entities/Building';

export class UpgradePopup {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle;
  private infoText!: Phaser.GameObjects.Text;
  private upgradeBtn!: Phaser.GameObjects.Text;
  private closeBtn!: Phaser.GameObjects.Text;

  private currentBuilding: Building | null = null;
  onUpgrade?: (b: Building) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(150).setScrollFactor(0).setVisible(false);
    this.buildUI();
  }

  private buildUI() {
    const W = 180;
    const H = 110;

    this.bg = this.scene.add.rectangle(0, 0, W, H, 0x111122, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.7);

    this.infoText = this.scene.add.text(-W / 2 + 10, -H / 2 + 10, '', {
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: W - 20 },
    });

    this.upgradeBtn = this.scene.add.text(0, H / 2 - 28, 'UPGRADE', {
      fontSize: '13px',
      color: '#ffdd00',
      backgroundColor: '#334400',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.upgradeBtn.on('pointerdown', () => {
      if (this.currentBuilding) this.onUpgrade?.(this.currentBuilding);
      this.refresh();
    });

    this.closeBtn = this.scene.add.text(W / 2 - 10, -H / 2 + 10, '✕', {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerdown', () => this.hide());

    this.container.add([this.bg, this.infoText, this.upgradeBtn, this.closeBtn]);
  }

  show(building: Building, screenX: number, screenY: number) {
    this.currentBuilding = building;
    this.container.setPosition(screenX, screenY);
    this.container.setVisible(true);
    this.refresh();
  }

  hide() {
    this.container.setVisible(false);
    this.currentBuilding = null;
  }

  private refresh() {
    if (!this.currentBuilding) return;
    const b = this.currentBuilding;
    const stats = b.config.levels[Math.min(b.level - 1, 2)];

    const info = [
      `${b.config.displayName} Sv.${b.level}`,
      `HP: ${b.hp}/${stats.hp}`,
      b.config.isLaser
        ? `Hasar: ${stats.damage}/sn`
        : `Hasar: ${stats.damage} | Menzil: ${stats.range}`,
    ].join('\n');

    this.infoText.setText(info);

    if (b.canUpgrade()) {
      this.upgradeBtn.setText(`UPGRADE (${b.getUpgradeCost()}g)`).setVisible(true);
    } else {
      this.upgradeBtn.setText('MAX').setVisible(true);
      this.upgradeBtn.setColor('#888888').disableInteractive();
    }
  }

  isVisible(): boolean {
    return this.container.visible;
  }
}
