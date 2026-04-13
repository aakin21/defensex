import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // asset loading buraya gelecek
  }

  create() {
    this.scene.start('LoginScene');
  }
}
