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
import { EnemySystem } from '../systems/EnemySystem';
import { Minimap } from '../ui/Minimap';
import { Joystick } from '../ui/Joystick';
import { AbilityButton } from '../ui/AbilityButton';
import { BuildingMenu } from '../ui/BuildingMenu';
import { UpgradePopup } from '../ui/UpgradePopup';
import { HUD } from '../ui/HUD';
import { BotMenu } from '../ui/BotMenu';
import { Hero } from '../entities/Hero';
import { BotUnit } from '../entities/BotUnit';
import { HERO_CONFIGS } from '../entities/HeroConfig';
import { BOT_CONFIGS } from '../entities/BotUnit';
import type { HeroType } from '../entities/HeroConfig';
import type { BotUnitType } from '../entities/BotUnit';
import type { Building } from '../entities/Building';
import { NetworkManager } from '../network/NetworkManager';

// Uzak oyuncunun basit görsel temsili
class RemoteHero extends Phaser.GameObjects.Container {
  private bodyCircle: Phaser.GameObjects.Arc;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, name: string) {
    super(scene, x, y);
    this.bodyCircle = scene.add.arc(0, 0, 18, 0, 360, false, color, 0.9);
    this.label = scene.add.text(0, -28, name, {
      fontSize: '11px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 3, y: 2 },
    }).setOrigin(0.5);
    this.add([this.bodyCircle, this.label]);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(20);
  }
}

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 1.5;
const BASE_X    = MAP_WIDTH  / 2;
const BASE_Y    = MAP_HEIGHT / 2;
const BASE_MAX_HP = 5000;
const BOT_LIMIT   = 10;

export class GameScene extends Phaser.Scene {
  private mapSystem!:      MapSystem;
  private buildingSystem!: BuildingSystem;
  private wallDraw!:       WallDrawSystem;
  private economy!:        EconomySystem;
  private enemySystem!:    EnemySystem;

  private minimap!:        Minimap;
  private joystick!:       Joystick;
  private abilityButton!:  AbilityButton;
  private buildingMenu!:   BuildingMenu;
  private botMenu!:        BotMenu;
  private upgradePopup!:   UpgradePopup;
  private hud!:            HUD;

  private hero!: Hero;
  private botUnits: BotUnit[] = [];

  // Seçili bot konuşlandırma türü
  private placingBotType: BotUnitType | null = null;

  // Phase yönetimi (server gelince senkronize edilecek)
  private gamePhase: 'prep' | 'wave' = 'prep';
  private prepTimeLeftMs = 30_000;
  private waveNumber = 1;
  private enemiesLeft = 0;

  // Base HP
  private baseHp = BASE_MAX_HP;

  // Kamera
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  // Bina yerleştirme ghost önizlemesi
  private ghostGfx!: Phaser.GameObjects.Graphics;

  // Multiplayer — uzak oyuncular
  private remoteHeroes: Map<string, RemoteHero> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { heroType?: HeroType }) {
    this.registry.set('heroType', data.heroType ?? 'Paladin');
  }

  create() {
    this.economy        = new EconomySystem(200);
    this.mapSystem      = new MapSystem();
    this.buildingSystem = new BuildingSystem(this, this.mapSystem, this.economy);
    this.wallDraw       = new WallDrawSystem(this);
    this.enemySystem    = new EnemySystem(this, this.economy);

    this.renderMap();
    this.placeBase();
    this.spawnHero();
    this.setupCamera();

    this.minimap       = new Minimap(this);
    this.joystick      = new Joystick(this);
    this.abilityButton = new AbilityButton(this);
    this.buildingMenu  = new BuildingMenu(this, this.economy);
    this.botMenu       = new BotMenu(this, this.economy);
    this.upgradePopup  = new UpgradePopup(this);
    this.ghostGfx      = this.add.graphics().setDepth(60);

    // HUD — hero config ile
    const heroType = this.registry.get('heroType') as HeroType;
    this.hud = new HUD(this, HERO_CONFIGS[heroType]);

    // Hızlı komut balonunu hero yanında göster
    this.hud.onQuickCommand = (cmd) => this.showQuickCommandBalloon(cmd);

    this.abilityButton.onPress = () => {
      this.hero.useAbility();
      NetworkManager.sendHeroAbility();
    };
    this.buildingSystem.onPlaceFailed = (msg) => this.showNotification(msg);

    this.setupBuildingInput();
    this.setupBotInput();
    this.setupPinchZoom();
    this.setupMultiplayer();
  }

  // ---- Multiplayer Wiring ----

  private setupMultiplayer() {
    const room = NetworkManager.gameRoom;
    if (!room) return; // offline mode

    // Diğer oyuncuların hero'larını dinle
    const players = (room.state as { players?: unknown }).players;
    if (players && typeof (players as { onAdd?: unknown }).onAdd === 'function') {
      (players as {
        onAdd: (cb: (player: { id: string; x: number; y: number; heroType: string; username: string; isDead: boolean }, key: string) => void) => void;
        onRemove: (cb: (_p: unknown, key: string) => void) => void;
      }).onAdd((player, key) => {
        // Kendi hero'muzu atla
        if (key === room.sessionId) return;
        const color = 0x00cc88;
        const remote = new RemoteHero(this, player.x, player.y, color, player.username ?? key.slice(0, 6));
        this.remoteHeroes.set(key, remote);
      });

      (players as {
        onAdd: (cb: (player: unknown, key: string) => void) => void;
        onRemove: (cb: (_p: unknown, key: string) => void) => void;
      }).onRemove((_p, key) => {
        const r = this.remoteHeroes.get(key);
        if (r) { r.destroy(); this.remoteHeroes.delete(key); }
      });
    }

    // Sunucudan gelen mesajlar
    room.onMessage('notification', (data: { msg: string }) => {
      this.showNotification(data.msg);
    });

    room.onMessage('game_over', (data: { wave: number }) => {
      this.triggerGameOver(data.wave);
    });

    room.onMessage('wave_start', (data: { waveNo: number }) => {
      this.waveNumber = data.waveNo;
    });
  }

  // ---- Harita ----

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

  // ---- Hero ----

  private spawnHero() {
    const heroType = this.registry.get('heroType') as HeroType;
    this.hero = new Hero(this, BASE_X, BASE_Y - 80, HERO_CONFIGS[heroType], this.mapSystem);
  }

  // ---- Kamera ----

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    cam.setZoom(0.5); // daha geniş görüş alanı
    // Kamerayı hemen hero'ya kilitle (lerp olmadan), sonra yumuşat
    cam.centerOn(this.hero.x, this.hero.y);
    cam.startFollow(this.hero, true, 0.1, 0.1);
  }

  // ---- Bina Konuşlandırma Input ----

  private setupBuildingInput() {
    this.buildingMenu.onSelect = (type) => {
      this.ghostGfx.clear();
      this.botMenu.deselect(); // karşılıklı dışlama
      this.placingBotType = null;

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

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.upgradePopup.isVisible()) {
        this.upgradePopup.hide();
        return;
      }

      const selected = this.buildingMenu.selectedType;
      if (!selected || selected === 'Wall') return;

      // Sağ menü alanına tıklamayı yoksay (ikon seçimi ile çakışmasın)
      if (ptr.x > this.scale.width - 70) return;

      const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);

      const hit = this.buildingSystem.buildings.find(b =>
        Phaser.Math.Distance.Between(world.x, world.y, b.x, b.y) < b.config.size / 2 + 8,
      );

      if (hit) {
        this.showUpgradePopup(hit, ptr.x, ptr.y);
        this.buildingMenu.deselect();
        return;
      }

      this.buildingSystem.placeBuilding(world.x, world.y, selected);
      NetworkManager.sendBuyBuilding(selected, world.x, world.y);
      this.buildingMenu.deselect();
      this.ghostGfx.clear();
    });

    // Ghost önizleme
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
    this.upgradePopup.onUpgrade = (b) => this.buildingSystem.upgradeBuilding(b);
  }

  // ---- Bot Konuşlandırma Input ----

  private setupBotInput() {
    this.botMenu.onSelect = (type) => {
      this.buildingMenu.deselect(); // karşılıklı dışlama
      this.wallDraw.deactivate();
      this.placingBotType = type;
    };

    // Bot konuşlandırma tap'i (building pointerdown ile çakışmaz — farklı guard)
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (!this.placingBotType) return;

      // Sağ menü tıklamasını geçir
      const { width } = this.scale;
      if (ptr.x > width - 70) return;

      // Limit kontrolü
      const aliveBots = this.botUnits.filter(b => !b.isDead);
      if (aliveBots.length >= BOT_LIMIT) {
        this.showNotification(`Bot limiti doldu! (max ${BOT_LIMIT})`);
        this.botMenu.deselect();
        this.placingBotType = null;
        return;
      }

      const cfg = BOT_CONFIGS[this.placingBotType];
      if (!this.economy.canAfford(cfg.cost)) {
        this.showNotification(`Yetersiz altın! (${cfg.cost}g gerekli)`);
        this.botMenu.deselect();
        this.placingBotType = null;
        return;
      }

      const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      this.economy.spend(cfg.cost);
      NetworkManager.sendBuyBot(this.placingBotType!, world.x, world.y);

      const bot = new BotUnit(this, world.x, world.y, cfg);
      this.botUnits.push(bot);

      this.botMenu.deselect();
      this.placingBotType = null;
    });
  }

  // ---- Pinch Zoom ----

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

  // ---- Bildirim ----

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

  // ---- Hızlı Komut Balonu (world space) ----

  private showQuickCommandBalloon(cmd: string) {
    const balloon = this.add.text(this.hero.x, this.hero.y - 60, cmd, {
      fontSize: '13px',
      color: '#' + this.heroColorHex(),
      backgroundColor: '#000000cc',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: balloon,
      y: balloon.y - 40,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.Out',
      onComplete: () => balloon.destroy(),
    });
  }

  private heroColorHex(): string {
    const heroType = this.registry.get('heroType') as HeroType;
    const color = HERO_CONFIGS[heroType].color;
    return color.toString(16).padStart(6, '0');
  }

  // ---- Phase Yönetimi (client-side placeholder) ----

  private updatePhase(delta: number) {
    // Server bağlıysa phase server'dan gelir — sadece offline modda çalıştır
    if (NetworkManager.gameRoom) return;

    if (this.gamePhase === 'prep') {
      this.prepTimeLeftMs -= delta;
      if (this.prepTimeLeftMs <= 0) {
        this.gamePhase      = 'wave';
        this.prepTimeLeftMs = 0;
        this.enemySystem.startWave(this.waveNumber);
        this.enemySystem.onWaveCleared = () => {
          const bonus = 50 + this.waveNumber * 10;
          this.economy.earn(bonus);
          this.waveNumber++;
          this.gamePhase      = 'prep';
          this.prepTimeLeftMs = 30_000;
        };
      }
    }
  }

  // ---- Update ----

  update(_time: number, delta: number) {
    // Hero hareketi
    if (this.joystick.isActive) {
      this.hero.move(this.joystick.dx, this.joystick.dy, delta);
      NetworkManager.sendHeroMove(this.joystick.dx, this.joystick.dy, delta);
    }

    this.hero.update(delta);
    this.abilityButton.updateCooldown(this.hero.getAbilityCooldownRatio());

    // Düşman hedef listesi (bina + bot + hero + base)
    const enemyTargets = [
      ...this.buildingSystem.buildings,
      ...this.buildingSystem.walls,
      ...this.botUnits.filter(b => !b.isDead),
      { x: this.hero.x, y: this.hero.y, takeDamage: (n: number) => this.hero.takeDamage(n), isDead: this.hero.isDead },
      { x: BASE_X, y: BASE_Y, takeDamage: (n: number) => { this.baseHp = Math.max(0, this.baseHp - n); if (this.baseHp === 0) this.triggerGameOver(); }, isDead: false },
    ];

    // Düşman sistemi
    this.enemySystem.update(delta, enemyTargets);
    this.enemiesLeft = this.enemySystem.getCount();

    // Hero auto-attack
    this.hero.tryAttack(this.enemySystem.getAlive(), delta);

    // Bot unit güncellemeleri
    this.botUnits = this.botUnits.filter(b => !b.isDead);
    for (const bot of this.botUnits) {
      bot.update(delta);
    }

    // Binalar
    this.buildingSystem.update(delta, this.enemySystem.getAlive());
    this.buildingMenu.update();
    this.botMenu.update();

    // Phase
    this.updatePhase(delta);

    // Multiplayer state sync
    this.syncServerState();

    // HUD güncelle
    this.hud.update({
      heroHp:          this.hero.hp,
      heroMaxHp:       this.hero.config.maxHp,
      gold:            this.economy.getGold(),
      wave:            this.waveNumber,
      enemiesLeft:     this.enemiesLeft,
      phase:           this.gamePhase,
      prepTimeLeftMs:  this.prepTimeLeftMs,
      baseHp:          this.baseHp,
      baseMaxHp:       BASE_MAX_HP,
    });

    // Minimap
    this.minimap.update(
      [{ x: this.hero.x, y: this.hero.y }],
      this.buildingSystem.getBuildingPositions(),
      this.enemySystem.getAlive().map(e => ({ x: e.x, y: e.y })),
    );
  }

  // ---- Server State Sync ----

  private syncServerState() {
    const room = NetworkManager.gameRoom;
    if (!room) return;

    const state = room.state as {
      sharedGold?: number;
      phase?: string;
      prepTimer?: number;
      currentWave?: number;
      baseHP?: number;
      players?: Map<string, { x: number; y: number; isDead: boolean; username: string }>;
    };

    // Altın sync
    if (state.sharedGold !== undefined) {
      this.economy.setGold(state.sharedGold);
    }

    // Phase sync
    if (state.phase === 'prep' || state.phase === 'wave') {
      this.gamePhase = state.phase;
    }
    if (state.prepTimer !== undefined) this.prepTimeLeftMs = state.prepTimer;
    if (state.currentWave !== undefined) this.waveNumber = state.currentWave;
    if (state.baseHP !== undefined) this.baseHp = state.baseHP;

    // Uzak hero pozisyonları sync
    if (state.players) {
      for (const [key, p] of state.players) {
        if (key === room.sessionId) continue;
        const remote = this.remoteHeroes.get(key);
        if (remote) {
          remote.x = p.x;
          remote.y = p.y;
          remote.setAlpha(p.isDead ? 0.3 : 1);
        }
      }
    }
  }

  private triggerGameOver(wave?: number) {
    this.enemySystem.clearAll();
    NetworkManager.leaveGame();
    this.scene.start('GameOverScene', {
      wave:        wave ?? this.waveNumber,
      kills:       0,
      deaths:      0,
      damageDealt: 0,
    });
  }
}
