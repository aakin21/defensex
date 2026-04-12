import Phaser from 'phaser';
import type { BuildingType } from '../entities/BuildingConfig';
import { BUILDING_CONFIGS } from '../entities/BuildingConfig';
import { EconomySystem } from '../systems/EconomySystem';

const ICON_SIZE = 52;
const ICON_GAP  = 8;
const MARGIN    = 10;

const MENU_ITEMS: BuildingType[] = ['ArrowTower', 'Mortar', 'LaserTower', 'Wall'];

export class BuildingMenu {
  private scene: Phaser.Scene;
  private economy: EconomySystem;
  private icons: Map<BuildingType, {
    bg: Phaser.GameObjects.Rectangle;
    costText: Phaser.GameObjects.Text;
  }> = new Map();

  selectedType: BuildingType | null = null;
  onSelect?: (type: BuildingType | null) => void;

  constructor(scene: Phaser.Scene, economy: EconomySystem) {
    this.scene = scene;
    this.economy = economy;
    this.build();
  }

  private build() {
    const { width, height } = this.scene.scale;
    const totalH = MENU_ITEMS.length * ICON_SIZE + (MENU_ITEMS.length - 1) * ICON_GAP;
    const startY = (height - totalH) / 2;

    MENU_ITEMS.forEach((type, i) => {
      const cfg = BUILDING_CONFIGS[type];
      const x = width - ICON_SIZE / 2 - MARGIN;
      const y = startY + i * (ICON_SIZE + ICON_GAP) + ICON_SIZE / 2;

      const bg = this.scene.add.rectangle(x, y, ICON_SIZE, ICON_SIZE, cfg.color, 0.85)
        .setScrollFactor(0)
        .setDepth(110)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x888888, 1);

      const label = this.scene.add.text(x, y - 6, this.iconLabel(type), {
        fontSize: '18px',
        color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(111);

      const cost = cfg.levels[0].upgradeCost;
      const costText = this.scene.add.text(x, y + 14, `${cost}g`, {
        fontSize: '10px',
        color: '#ffdd00',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(111);

      bg.on('pointerdown', () => this.toggleSelect(type));
      bg.on('pointerover', () => { if (this.selectedType !== type) bg.setStrokeStyle(2, 0xffffff, 1); });
      bg.on('pointerout',  () => { if (this.selectedType !== type) bg.setStrokeStyle(2, 0x888888, 1); });

      this.icons.set(type, { bg, costText });
      void label;
    });
  }

  private iconLabel(type: BuildingType): string {
    const labels: Record<BuildingType, string> = {
      ArrowTower: '🏹',
      Mortar:     '💣',
      LaserTower: '⚡',
      Wall:       '▬',
    };
    return labels[type];
  }

  private toggleSelect(type: BuildingType) {
    if (this.selectedType === type) {
      this.deselect();
    } else {
      this.select(type);
    }
  }

  select(type: BuildingType) {
    this.deselect();
    this.selectedType = type;
    const icon = this.icons.get(type);
    if (icon) {
      icon.bg.setStrokeStyle(3, 0xffdd00, 1);
      icon.bg.setFillStyle(BUILDING_CONFIGS[type].color, 1);
    }
    this.onSelect?.(type);
  }

  deselect() {
    if (this.selectedType) {
      const icon = this.icons.get(this.selectedType);
      if (icon) {
        icon.bg.setStrokeStyle(2, 0x888888, 1);
        icon.bg.setFillStyle(BUILDING_CONFIGS[this.selectedType].color, 0.85);
      }
    }
    this.selectedType = null;
    this.onSelect?.(null);
  }

  update() {
    // altın yetersizse ikon grileşir
    for (const [type, { bg }] of this.icons) {
      const cost = BUILDING_CONFIGS[type].levels[0].upgradeCost;
      const canAfford = this.economy.canAfford(cost);
      bg.setAlpha(canAfford ? 1 : 0.45);
    }
  }
}
