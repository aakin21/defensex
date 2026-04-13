import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 80, 'FORTRESS FANTASY', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const playBtn = this.add.text(width / 2, height / 2 + 20, 'OYNA', {
      fontSize: '32px',
      color: '#ffdd00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });

    playBtn.on('pointerover', () => playBtn.setColor('#fff'));
    playBtn.on('pointerout', () => playBtn.setColor('#ffdd00'));
  }
}
