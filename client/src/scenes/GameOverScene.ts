import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { wave?: number }) {
    this.registry.set('finalWave', data.wave ?? 0);
  }

  create() {
    const { width, height } = this.scale;
    const wave = this.registry.get('finalWave');

    this.add.text(width / 2, height / 2 - 80, 'OYUN BİTTİ', {
      fontSize: '48px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Ulaşılan Wave: ${wave}`, {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // TODO: istatistik tablosu buraya gelecek

    const menuBtn = this.add.text(width / 2, height / 2 + 100, 'Ana Menü', {
      fontSize: '28px',
      color: '#ffdd00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    menuBtn.on('pointerover', () => menuBtn.setColor('#fff'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#ffdd00'));
  }
}
