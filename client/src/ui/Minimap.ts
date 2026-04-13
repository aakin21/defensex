import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../systems/MapSystem';

const MINIMAP_SIZE = 150;
const MINIMAP_MARGIN = 10;

export class Minimap {
  private scene: Phaser.Scene;
  camera: Phaser.Cameras.Scene2D.Camera;

  // dot containers — doldurulacak hero/bina/düşman eklenince
  private heroGraphics: Phaser.GameObjects.Graphics;
  private buildingGraphics: Phaser.GameObjects.Graphics;
  private enemyGraphics: Phaser.GameObjects.Graphics;
  private borderGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width, height } = scene.scale;
    const x = width - MINIMAP_SIZE - MINIMAP_MARGIN;
    const y = height - MINIMAP_SIZE - MINIMAP_MARGIN;

    this.camera = scene.cameras.add(x, y, MINIMAP_SIZE, MINIMAP_SIZE);
    this.camera.setZoom(MINIMAP_SIZE / MAP_WIDTH);
    this.camera.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.camera.setScroll(MAP_WIDTH / 2 - MAP_WIDTH / 2, MAP_HEIGHT / 2 - MAP_HEIGHT / 2);
    this.camera.setBackgroundColor(0x001133);

    // dot katmanları — UI kamerası tarafından gösterilecek
    this.heroGraphics     = scene.add.graphics().setDepth(200);
    this.buildingGraphics = scene.add.graphics().setDepth(200);
    this.enemyGraphics    = scene.add.graphics().setDepth(200);

    // ana kamera bu dot'ları görmemeli, sadece minimap kamerası görmeli
    scene.cameras.main.ignore([this.heroGraphics, this.buildingGraphics, this.enemyGraphics]);

    // kenarlık — ana kamera UI katmanında çizilir
    this.borderGraphics = scene.add.graphics().setScrollFactor(0).setDepth(201);
    this.borderGraphics.lineStyle(2, 0xffffff, 0.8);
    this.borderGraphics.strokeRect(x - 1, y - 1, MINIMAP_SIZE + 2, MINIMAP_SIZE + 2);

    // minimap kamerası dot'ları ignore etmeli — ana world'ü göstersin
    this.camera.ignore([this.borderGraphics]);
  }

  /** Dünya kamerasının görmemesi gereken dahili minimap noktaları */
  getInternalObjects(): Phaser.GameObjects.GameObject[] {
    return [this.heroGraphics, this.buildingGraphics, this.enemyGraphics];
  }

  update(
    heroes: { x: number; y: number }[],
    buildings: { x: number; y: number }[],
    enemies: { x: number; y: number }[],
  ) {
    const DOT = 12; // minimap koordinatı cinsinden nokta boyutu (world * zoom)

    this.heroGraphics.clear();
    this.buildingGraphics.clear();
    this.enemyGraphics.clear();

    this.heroGraphics.fillStyle(0x00ff44, 1);
    for (const h of heroes) {
      this.heroGraphics.fillCircle(h.x, h.y, DOT);
    }

    this.buildingGraphics.fillStyle(0x4488ff, 1);
    for (const b of buildings) {
      this.buildingGraphics.fillRect(b.x - DOT / 2, b.y - DOT / 2, DOT, DOT);
    }

    this.enemyGraphics.fillStyle(0xff3333, 1);
    for (const e of enemies) {
      this.enemyGraphics.fillCircle(e.x, e.y, DOT);
    }
  }
}
