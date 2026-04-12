import Phaser from 'phaser';
import {
  MapSystem,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  TERRAIN_COLOR,
} from '../systems/MapSystem';
import { Minimap } from '../ui/Minimap';
import { Hero, HERO_CONFIGS } from '../entities/Hero';
import { Joystick } from '../ui/Joystick';
import { AbilityButton } from '../ui/AbilityButton';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const BASE_X = MAP_WIDTH / 2;
const BASE_Y = MAP_HEIGHT / 2;

export class GameScene extends Phaser.Scene {
  private mapSystem!: MapSystem;
  private minimap!: Minimap;
  private hero!: Hero;
  private joystick!: Joystick;
  private abilityBtn!: AbilityButton;
  private selectedHeroKey = 'paladin';

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

  init(data: { heroKey?: string }) {
    this.selectedHeroKey = data?.heroKey ?? 'paladin';
  }

  create() {
    this.mapSystem = new MapSystem();
    this.renderMap();
    this.placeBase();
    this.setupCamera();
    this.generateHeroTextures();
    this.createHero();
    this.minimap = new Minimap(this);
    this.createHUD();
    this.setupInput();
  }

  // ---- texture üretimi ----

  private generateHeroTextures() {
    for (const cfg of HERO_CONFIGS) {
      const key = cfg.key + '_hero';
      if (this.textures.exists(key)) continue;
      const gfx = this.make.graphics();
      gfx.fillStyle(cfg.color, 1);
      gfx.fillCircle(24, 24, 20);
      gfx.lineStyle(2, 0xffffff, 0.85);
      gfx.strokeCircle(24, 24, 20);
      // yön noktası (üst)
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillCircle(24, 7, 4);
      gfx.generateTexture(key, 48, 48);
      gfx.destroy();
    }
  }

  // ---- hero ----

  private createHero() {
    const cfg = HERO_CONFIGS.find(h => h.key === this.selectedHeroKey) ?? HERO_CONFIGS[0];
    this.hero = new Hero(this, BASE_X, BASE_Y + 90, cfg);
  }

  // ---- HUD ----

  private createHUD() {
    const { width, height } = this.scale;
    const cfg = HERO_CONFIGS.find(h => h.key === this.selectedHeroKey) ?? HERO_CONFIGS[0];

    this.joystick = new Joystick(this, 110, height - 130);

    this.abilityBtn = new AbilityButton(
      this,
      width - 90,
      height - 130,
      cfg.abilityName,
      cfg.abilityCooldown,
      () => { this.hero.activateAbility(); },
    );

    // hero görseli + HUD objelerini minimap kamerasından gizle
    this.minimap.camera.ignore([
      ...this.joystick.getObjects(),
      ...this.abilityBtn.getObjects(),
      ...this.hero.getDisplayObjects(),
    ]);
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
    const { width, height } = this.scale;

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.input.pointer2.isDown) return;
      // joystick bölgesi: ekranın sol yarısı, alt %40
      if (ptr.x < width * 0.5 && ptr.y > height * 0.6) return;
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
          cam.setZoom(Phaser.Math.Clamp(
            this.pinchStartZoom * (dist / this.pinchStartDist),
            ZOOM_MIN, ZOOM_MAX,
          ));
        }
        return;
      }

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

    this.input.on(
      'wheel',
      (_ptr: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, ZOOM_MIN, ZOOM_MAX));
      },
    );
  }

  // ---- update ----

  update(_time: number, delta: number) {
    const dir = this.joystick.getDirection();
    const mag = this.joystick.getMagnitude();
    this.hero.move(dir.x, dir.y, mag, this.mapSystem);
    this.hero.update(delta, this.mapSystem);
    this.abilityBtn.update(delta);

    this.minimap.update(
      [{ x: this.hero.x, y: this.hero.y }],
      [],
      [],
    );
  }
}
