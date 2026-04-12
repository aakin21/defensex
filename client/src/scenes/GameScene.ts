import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // TODO: tilemap, hero, HUD, Colyseus bağlantısı buraya gelecek
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2, 'GameScene — yapım aşamasında', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  update() {
    // oyun döngüsü
  }
}
