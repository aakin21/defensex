import Phaser from 'phaser';
import {
  MapSystem,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  TERRAIN_COLOR,
} from '../systems/MapSystem';
import { BuildingSystem } from '../systems/BuildingSystem';
import { WallDrawSystem } from '../systems/WallDrawSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { Minimap } from '../ui/Minimap';
import { Joystick } from '../ui/Joystick';
import { AbilityButton } from '../ui/AbilityButton';
import { BuildingMenu } from '../ui/BuildingMenu';
import { UpgradePopup } from '../ui/UpgradePopup';
import { Hero } from '../entities/Hero';
import { HERO_CONFIGS } from '../entities/HeroConfig';
import type { HeroType } from '../entities/HeroConfig';
import type { Building } from '../entities/Building';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const BASE_X   = MAP_WIDTH  / 2;
const BASE_Y   = MAP_HEIGHT / 2;

export class GameScene extends Phaser.Scene {
  private mapSystem!:      MapSystem;
  private buildingSystem!: BuildingSystem;
  private wallDraw!:       WallDrawSystem;
  private economy!:        EconomySystem;

  private minimap!:        Minimap;
  private joystick!:       Joystick;
  private abilityButton!:  AbilityButton;
  private buildingMenu!:   BuildingMenu;
  private upgradePopup!:   UpgradePopup;

  private hero!: Hero;

  // kamera
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  // placement ghost (bina önizleme)
  private ghostGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { heroType?: HeroType }) {
    this.registry.set('heroType', data.heroType ?? 'Paladin');
  }

  create() {
    this.economy       = new EconomySystem(200);
    this.mapSystem     = new MapSystem();
    this.buildingSystem = new BuildingSystem(this, this.mapSystem, this.economy);
    this.wallDraw      = new WallDrawSystem(this);

    this.renderMap();
    this.placeBase();
    this.spawnHero();
    this.setupCamera();

    this.minimap       = new Minimap(this);
    this.joystick      = new Joystick(this);
    this.abilityButton = new AbilityButton(this);
    this.buildingMenu  = new BuildingMenu(this, this.economy);
    this.upgradePopup  = new UpgradePopup(this);
    this.ghostGfx      = this.add.graphics().setDepth(60);

    this.abilityButton.onPress = () => this.hero.useAbility();

    this.buildingSystem.onPlaceFailed = (msg) => this.showNotification(msg);

    this.setupBuildingInput();
    this.setupPinchZoom();
  }

  // ---- harita ----

  private renderMap() {
    const rt  = this.add.renderTexture(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const gfx = this.add.graphics();
    const mapData = this.mapSystem.getData();

    for (let row = 0; row < mapData.length; row++) {
      for (let col = 0; col < mapData[row].length; col++) {
        const terrain = mapData[row][col];
        gfx.fillStyle(TERRAIN_COLOR[terrain], 1);
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
    base.setPosition(BASE_X, BASE_Y).setDepth(10);

    this.add.text(BASE_X, BASE_Y - 64, 'BASE', {
      fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);
  }

  // ---- hero ----

  private spawnHero() {
    const heroType = this.registry.get('heroType') as HeroType;
    this.hero = new Hero(this, BASE_X, BASE_Y - 80, HERO_CONFIGS[heroType], this.mapSystem);
  }

  // ---- kamera ----

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    cam.setZoom(1);
    cam.startFollow(this.hero, true, 0.08, 0.08);
  }

  // ---- input: bina yerleştirme ----

  private setupBuildingInput() {
    this.buildingMenu.onSelect = (type) => {
      this.ghostGfx.clear();
      if (type === 'Wall') {
        this.wallDraw.activate();
        this.wallDraw.onDrawComplete = (x1, y1, x2, y2) => {
          this.buildingSystem.drawWalls(x1, y1, x2, y2);
          this.buildingMenu.deselect();
          this.wallDraw.deactivate();
        };
        this.wallDraw.onDrawCancel = () => {
          this.buildingMenu.deselect();
          this.wallDraw.deactivate();
        };
      } else {
        this.wallDraw.deactivate();
      }
    };

    // haritaya tıklama: bina koy veya mevcut binayı seç
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.upgradePopup.isVisible()) {
        // popup dışına tıklandıysa kapat
        this.upgradePopup.hide();
        return;
      }

      const selected = this.buildingMenu.selectedType;
      if (!selected || selected === 'Wall') return;

      const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);

      // mevcut binaya tıklandı mı?
      const hit = this.buildingSystem.buildings.find(b => {
        return Phaser.Math.Distance.Between(world.x, world.y, b.x, b.y) < b.config.size / 2 + 8;
      });

      if (hit) {
        this.showUpgradePopup(hit, ptr.x, ptr.y);
        this.buildingMenu.deselect();
        return;
      }

      // yeni bina koy
      this.buildingSystem.placeBuilding(world.x, world.y, selected);
      this.buildingMenu.deselect();
      this.ghostGfx.clear();
    });

    // ghost önizleme
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const selected = this.buildingMenu.selectedType;
      if (!selected || selected === 'Wall') {
        this.ghostGfx.clear();
        return;
      }
      const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const check = this.buildingSystem.canPlaceAt(world.x, world.y, selected);
      const color = check.ok ? 0x44ff44 : 0xff4444;
      const size  = 40;

      this.ghostGfx.clear();
      this.ghostGfx.fillStyle(color, 0.4);
      this.ghostGfx.fillRect(world.x - size / 2, world.y - size / 2, size, size);
      this.ghostGfx.lineStyle(2, color, 0.8);
      this.ghostGfx.strokeRect(world.x - size / 2, world.y - size / 2, size, size);
    });
  }

  private showUpgradePopup(building: Building, screenX: number, screenY: number) {
    const { width, height } = this.scale;
    const px = Phaser.Math.Clamp(screenX, 100, width  - 100);
    const py = Phaser.Math.Clamp(screenY, 70,  height - 70);
    this.upgradePopup.show(building, px, py);
    this.upgradePopup.onUpgrade = (b) => {
      this.buildingSystem.upgradeBuilding(b);
    };
  }

  // ---- pinch zoom ----

  private setupPinchZoom() {
    const cam = this.cameras.main;

    this.input.on('pointermove', () => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        const p1 = this.input.pointer1;
        const p2 = this.input.pointer2;
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

        if (this.pinchStartDist === 0) {
          this.pinchStartDist = dist;
          this.pinchStartZoom = cam.zoom;
        } else {
          cam.setZoom(
            Phaser.Math.Clamp(this.pinchStartZoom * (dist / this.pinchStartDist), ZOOM_MIN, ZOOM_MAX),
          );
        }
      }
    });

    this.input.on('pointerup', () => { this.pinchStartDist = 0; });

    this.input.on(
      'wheel',
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, ZOOM_MIN, ZOOM_MAX));
      },
    );
  }

  // ---- bildirim ----

  private showNotification(msg: string) {
    const { width, height } = this.scale;
    const txt = this.add.text(width / 2, height - 180, msg, {
      fontSize: '14px',
      color: '#ff4444',
      backgroundColor: '#000000cc',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.time.delayedCall(2000, () => txt.destroy());
  }

  // ---- update ----

  update(_time: number, delta: number) {
    if (this.joystick.isActive) {
      this.hero.move(this.joystick.dx, this.joystick.dy, delta);
    }

    this.hero.update(delta);
    this.abilityButton.updateCooldown(this.hero.getAbilityCooldownRatio());

    this.buildingSystem.update(delta, []);  // düşmanlar Faz 5/6'da gelecek
    this.buildingMenu.update();

    this.minimap.update(
      [{ x: this.hero.x, y: this.hero.y }],
      this.buildingSystem.getBuildingPositions(),
      [],
    );
  }
}
