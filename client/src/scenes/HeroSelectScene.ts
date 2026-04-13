import Phaser from 'phaser';
import { HERO_CONFIGS, HERO_TYPES } from '../entities/HeroConfig';
import type { HeroType } from '../entities/HeroConfig';
import { NetworkManager } from '../network/NetworkManager';

const CARD_W = 130;
const CARD_H = 190;
const CARD_GAP = 18;

export class HeroSelectScene extends Phaser.Scene {
  private selectedHero: HeroType = 'Paladin';
  private cards: Map<HeroType, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super({ key: 'HeroSelectScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 40, 'HERO SEÇ', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const totalW = HERO_TYPES.length * CARD_W + (HERO_TYPES.length - 1) * CARD_GAP;
    let startX = (width - totalW) / 2 + CARD_W / 2;

    // 2 satır — 3 hero üstte, 3 altta
    const ROW1 = HERO_TYPES.slice(0, 3);
    const ROW2 = HERO_TYPES.slice(3, 6);

    this.buildRow(ROW1, startX, height / 2 - CARD_H / 2 - 20);
    this.buildRow(ROW2, startX, height / 2 + CARD_H / 2 + 20);

    // Oyna butonu
    const btn = this.add.text(width / 2, height - 60, 'OYNA', {
      fontSize: '28px',
      color: '#ffdd00',
      backgroundColor: '#333333',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', async () => {
      // Eğer lobby bağlantısı varsa server'a join game gönder
      if (NetworkManager.lobbyRoom) {
        const result = await NetworkManager.joinGame(this.selectedHero);
        if (!result.ok) {
          // Bağlanamazsa offline devam et
          console.warn('Game join failed:', result.msg);
        }
      }
      this.scene.start('GameScene', { heroType: this.selectedHero });
    });

    this.selectHero('Paladin');
  }

  private buildRow(types: HeroType[], startX: number, y: number) {
    types.forEach((type, i) => {
      const x = startX + i * (CARD_W + CARD_GAP);
      const card = this.buildCard(type, x, y);
      this.cards.set(type, card);
    });
  }

  private buildCard(type: HeroType, x: number, y: number): Phaser.GameObjects.Container {
    const cfg = HERO_CONFIGS[type];
    const container = this.add.container(x, y);

    // arka plan
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x222244, 0.9)
      .setInteractive({ useHandCursor: true });

    // hero renk dairesi
    const circle = this.add.arc(0, -42, 32, 0, 360, false, cfg.color, 1);

    // isim
    const name = this.add.text(0, 2, cfg.displayName, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // kısa istatistikler
    const stats = this.add.text(0, 22, `HP: ${cfg.maxHp}  SPD: ${cfg.speed}`, {
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // yetenek adı
    const abilityName = this.add.text(0, 44, cfg.ability.name, {
      fontSize: '10px',
      color: '#88aaff',
    }).setOrigin(0.5);

    // cooldown
    const cdText = this.add.text(0, 60, `CD: ${cfg.ability.cooldown}sn`, {
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // border (seçim için)
    const border = this.add.rectangle(0, 0, CARD_W, CARD_H)
      .setStrokeStyle(2, 0xffffff, 0);

    container.add([bg, circle, name, stats, abilityName, cdText, border]);

    bg.on('pointerdown', () => this.selectHero(type));
    bg.on('pointerover', () => bg.setFillStyle(0x334466, 0.9));
    bg.on('pointerout',  () => {
      if (this.selectedHero !== type) bg.setFillStyle(0x222244, 0.9);
    });

    // border'ı container'daki index ile erişmek için tag
    container.setData('border', border);
    container.setData('bg', bg);
    container.setData('type', type);

    return container;
  }

  private selectHero(type: HeroType) {
    // önceki seçimi temizle
    const prev = this.cards.get(this.selectedHero);
    if (prev) {
      const b = prev.getData('border') as Phaser.GameObjects.Rectangle;
      const bg = prev.getData('bg') as Phaser.GameObjects.Rectangle;
      b.setStrokeStyle(2, 0xffffff, 0);
      bg.setFillStyle(0x222244, 0.9);
    }

    this.selectedHero = type;

    // yeni seçimi vurgula
    const card = this.cards.get(type);
    if (card) {
      const b = card.getData('border') as Phaser.GameObjects.Rectangle;
      const bg = card.getData('bg') as Phaser.GameObjects.Rectangle;
      b.setStrokeStyle(2, 0xffdd00, 1);
      bg.setFillStyle(0x334422, 0.95);
    }
  }
}
