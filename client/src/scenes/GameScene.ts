import Phaser from 'phaser';
import {
  MapSystem,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  TERRAIN_COLOR,
  TerrainType,
} from '../systems/MapSystem';
import { Minimap } from '../ui/Minimap';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const BASE_X = MAP_WIDTH / 2;
const BASE_Y = MAP_HEIGHT / 2;

export class GameScene extends Phaser.Scene {
  private mapSystem!: MapSystem;
  private minimap!: Minimap;

  // kamera sürükleme
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartScrollX = 0;
  private camStartScrollY = 0;

  // pinch zoom
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.mapSystem = new MapSystem();
    this.renderMap();
    this.placeBase();
    this.setupCamera();
    this.minimap = new Minimap(this);
    this.setupInput();
  }

  // ---- harita ----

  private renderMap() {
    const rt = this.add.renderTexture(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const gfx = this.add.graphics();
    const mapData = this.mapSystem.getData();

    for (let row = 0; row < mapData.length; row++) {
      for (let col = 0; col < mapData[row].length; col++) {
        const terrain = mapData[row][col];
        const color = TERRAIN_COLOR[terrain];
        gfx.fillStyle(color, 1);
        gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

        // ızgara çizgisi
        gfx.lineStyle(1, 0x000000, 0.15);
        gfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

        rt.draw(gfx, col * TILE_SIZE, row * TILE_SIZE);
        gfx.clear();
      }
    }

    gfx.destroy();
    rt.setDepth(0);
  }

  private placeBase() {
    // placeholder — gerçek base görseli gelince değiştirilecek
    const base = this.add.graphics();
    base.fillStyle(0xddaa00, 1);
    base.fillRect(-48, -48, 96, 96);
    base.lineStyle(3, 0xffffff, 1);
    base.strokeRect(-48, -48, 96, 96);
    base.setPosition(BASE_X, BASE_Y);
    base.setDepth(10);

    this.add.text(BASE_X, BASE_Y - 64, 'BASE', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);
  }

  // ---- kamera ----

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    cam.setZoom(1);
    cam.centerOn(BASE_X, BASE_Y);
  }

  // ---- input ----

  private setupInput() {
    const cam = this.cameras.main;

    // tek parmak sürükleme
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.input.pointer2.isDown) return; // pinch sırasında drag yok
      this.isDragging = true;
      this.dragStartX = ptr.x;
      this.dragStartY = ptr.y;
      this.camStartScrollX = cam.scrollX;
      this.camStartScrollY = cam.scrollY;
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      // pinch zoom
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.isDragging = false;
        const p1 = this.input.pointer1;
        const p2 = this.input.pointer2;
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

        if (this.pinchStartDist === 0) {
          this.pinchStartDist = dist;
          this.pinchStartZoom = cam.zoom;
        } else {
          const newZoom = Phaser.Math.Clamp(
            this.pinchStartZoom * (dist / this.pinchStartDist),
            ZOOM_MIN,
            ZOOM_MAX,
          );
          cam.setZoom(newZoom);
        }
        return;
      }

      // tek parmak drag
      if (this.isDragging && ptr.isDown) {
        const dx = (ptr.x - this.dragStartX) / cam.zoom;
        const dy = (ptr.y - this.dragStartY) / cam.zoom;
        cam.setScroll(this.camStartScrollX - dx, this.camStartScrollY - dy);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.pinchStartDist = 0;
    });

    // fare tekerleği (masaüstü test için)
    this.input.on(
      'wheel',
      (_ptr: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
        const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, ZOOM_MIN, ZOOM_MAX);
        cam.setZoom(newZoom);
      },
    );
  }

  update() {
    // minimap hero/bina/düşman dotları — şimdilik sadece base merkezi
    this.minimap.update(
      [{ x: BASE_X, y: BASE_Y }],
      [],
      [],
    );
  }
}
