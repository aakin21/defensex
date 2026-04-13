import Phaser from 'phaser';
import { BOT_CONFIGS, BOT_TYPES } from '../entities/BotUnit';
import type { BotUnitType } from '../entities/BotUnit';
import { EconomySystem } from '../systems/EconomySystem';

// GDD: "Sağ tarafta dikey ikon listesi"
// Bot menüsü, BuildingMenu'nun altına yerleşir

const ICON_SIZE = 52;
const ICON_GAP  = 8;
const MARGIN    = 10;

// BuildingMenu'nun 4 ikonunu hesaba kat:
// totalH = 4*52 + 3*8 = 232, startY = (854-232)/2 = 311
// son ikon: 311 + 3*60 + 52/2 = 311+180+26 = 517 → alt kenar 517+26 = 543
// Bot menüsü: 543 + 16 (ayırıcı) = 559
const BOT_MENU_START_Y = 559;

export class BotMenu {
  private scene: Phaser.Scene;
  private economy: EconomySystem;
  private icons: Map<BotUnitType, Phaser.GameObjects.Rectangle> = new Map();

  selectedType: BotUnitType | null = null;
  onSelect?: (type: BotUnitType | null) => void;

  constructor(scene: Phaser.Scene, economy: EconomySystem) {
    this.scene = scene;
    this.economy = economy;
    this.build();
  }

  private build() {
    const { width } = this.scene.scale;
    const x = width - ICON_SIZE / 2 - MARGIN;

    BOT_TYPES.forEach((type, i) => {
      const cfg = BOT_CONFIGS[type];
      const y = BOT_MENU_START_Y + i * (ICON_SIZE + ICON_GAP) + ICON_SIZE / 2;

      // Arka plan dikdörtgen
      const bg = this.scene.add
        .rectangle(x, y, ICON_SIZE, ICON_SIZE, cfg.color, 0.85)
        .setScrollFactor(0)
        .setDepth(110)
        .setStrokeStyle(2, 0x888888, 1)
        .setInteractive({ useHandCursor: true });

      // Tür sembolü
      this.scene.add
        .text(x, y - 6, cfg.type === 'Warrior' ? '⚔️' : '🛡️', { fontSize: '18px' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(111);

      // Maliyet
      this.scene.add
        .text(x, y + 14, `${cfg.cost}g`, { fontSize: '10px', color: '#ffdd00' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(111);

      bg.on('pointerdown', () => this.toggleSelect(type));
      bg.on('pointerover', () => { if (this.selectedType !== type) bg.setStrokeStyle(2, 0xffffff, 1); });
      bg.on('pointerout',  () => { if (this.selectedType !== type) bg.setStrokeStyle(2, 0x888888, 1); });

      this.icons.set(type, bg);
    });

    // Ayırıcı çizgi
    const sep = this.scene.add.graphics().setScrollFactor(0).setDepth(110);
    sep.lineStyle(1, 0x555555, 0.8);
    sep.lineBetween(x - ICON_SIZE / 2, BOT_MENU_START_Y - 8, x + ICON_SIZE / 2, BOT_MENU_START_Y - 8);
  }

  private toggleSelect(type: BotUnitType) {
    if (this.selectedType === type) {
      this.deselect();
    } else {
      this.select(type);
    }
  }

  select(type: BotUnitType) {
    this.deselect();
    this.selectedType = type;
    const icon = this.icons.get(type);
    if (icon) {
      icon.setStrokeStyle(3, 0xffdd00, 1);
      icon.setFillStyle(BOT_CONFIGS[type].color, 1);
    }
    this.onSelect?.(type);
  }

  deselect() {
    if (this.selectedType) {
      const icon = this.icons.get(this.selectedType);
      if (icon) {
        icon.setStrokeStyle(2, 0x888888, 1);
        icon.setFillStyle(BOT_CONFIGS[this.selectedType].color, 0.85);
      }
    }
    this.selectedType = null;
    this.onSelect?.(null);
  }

  update() {
    for (const [type, icon] of this.icons) {
      const canAfford = this.economy.canAfford(BOT_CONFIGS[type].cost);
      icon.setAlpha(canAfford ? 1 : 0.45);
    }
  }
}
