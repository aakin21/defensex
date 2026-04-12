import Phaser from 'phaser';
import {
  MapSystem,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  TERRAIN_COLOR,
} from '../systems/MapSystem';
import { Minimap } from '../ui/Minimap';
import { Joystick } from '../ui/Joystick';
import { AbilityButton } from '../ui/AbilityButton';
import { Hero } from '../entities/Hero';
import { HERO_CONFIGS } from '../entities/HeroConfig';
import type { HeroType } from '../entities/HeroConfig';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const BASE_X = MAP_WIDTH / 2;
const BASE_Y = MAP_HEIGHT / 2;

export class GameScene extends Phaser.Scene {
  private mapSystem!: MapSystem;
  private minimap!: Minimap;
  private joystick!: Joystick;
  private abilityButton!: AbilityButton;
  private hero!: Hero;

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

  init(data: { heroType?: HeroType }) {
    this.registry.set('heroType', data.heroType ?? 'Paladin');
  }

  create() {
    this.mapSystem = new MapSystem();
    this.renderMap();
    this.placeBase();
    this.spawnHero();
    this.setupCamera();
    this.minimap = new Minimap(this);
    this.joystick = new Joystick(this);
    this.abilityButton = new AbilityButton(this);
    this.abilityButton.onPress = () => this.hero.useAbility();
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
    base.setPosition(BASE_X, BASE_Y);
    base.setDepth(10);

    this.add.text(BASE_X, BASE_Y - 64, 'BASE', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);
  }

  // ---- hero ----

  private spawnHero() {
    const heroType = this.registry.get('heroType') as HeroType;
    const config   = HERO_CONFIGS[heroType];

    this.hero = new Hero(this, BASE_X, BASE_Y - 80, config, this.mapSystem);

    this.hero.onAbilityUse = (_ability, _hero) => {
      // TODO: server'a yetenek mesajı gönder (Colyseus bağlantısı hazır olunca)
    };

    this.hero.onDeath = (_hero) => {
      // TODO: ölüm animasyonu, respawn ekrana bildirim
    };
  }

  // ---- kamera ----

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    cam.setZoom(1);
    cam.startFollow(this.hero, true, 0.08, 0.08);
  }

  // ---- input ----

  private setupInput() {
    const cam = this.cameras.main;

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.input.pointer2.isDown) return;
      // joystick sol yarı, ability sağda — sürükleme sadece boş alanlarda
      if (ptr.x < this.scale.width / 2) return;
      this.isDragging = true;
      this.dragStartX = ptr.x;
      this.dragStartY = ptr.y;
      this.camStartScrollX = cam.scrollX;
      this.camStartScrollY = cam.scrollY;
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.isDragging = false;
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

  update(_time: number, delta: number) {
    // hero hareketi
    if (this.joystick.isActive) {
      this.hero.move(this.joystick.dx, this.joystick.dy, delta);
    }

    // hero güncelle
    this.hero.update(delta);

    // ability cooldown overlay
    this.abilityButton.updateCooldown(this.hero.getAbilityCooldownRatio());

    // minimap
    this.minimap.update(
      [{ x: this.hero.x, y: this.hero.y }],
      [],
      [],
    );
  }
}
