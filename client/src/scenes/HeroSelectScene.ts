import Phaser from 'phaser';
import { HERO_CONFIGS } from '../entities/Hero';
import type { HeroConfig } from '../entities/Hero';

const CARD_W = 210;
const CARD_H = 112;
const GAP = 16;
const START_X = 20;
const START_Y = 112;

export class HeroSelectScene extends Phaser.Scene {
  private selectedKey: string | null = null;
  private selBorder!: Phaser.GameObjects.Graphics;
  private cardBgs: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private playBtn!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HeroSelectScene' });
  }

  create() {
    const { width } = this.scale;

    this.add.text(width / 2, 48, 'HERO SEÇ', {
      fontSize: '34px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 84, 'Bir hero seçip oyuna başla', {
      fontSize: '13px',
      color: '#888888',
    }).setOrigin(0.5);

    // seçim vurgu grafiği (tek obje, seçilen kartın üstüne taşınır)
    this.selBorder = this.add.graphics().setDepth(10);

    // hero kartları
    HERO_CONFIGS.forEach((cfg, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = START_X + col * (CARD_W + GAP);
      const y = START_Y + row * (CARD_H + GAP);
      this.createCard(cfg, x, y);
    });

    // Oyna butonu
    this.playBtn = this.add
      .text(width / 2, 730, 'OYNA  →', {
        fontSize: '28px',
        color: '#555555',
        backgroundColor: '#222222',
        padding: { x: 32, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.playBtn.on('pointerdown', () => {
      if (!this.selectedKey) return;
      this.scene.start('GameScene', { heroKey: this.selectedKey });
    });

    // Geri butonu
    this.add
      .text(20, 24, '← Geri', { fontSize: '15px', color: '#666666' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private createCard(cfg: HeroConfig, x: number, y: number) {
    const bg = this.add.graphics().setDepth(1);
    this.cardBgs.set(cfg.key, bg);
    this.drawCardBg(bg, x, y, false);

    // renk dairesi
    const circle = this.add.graphics().setDepth(2);
    circle.fillStyle(cfg.color, 1);
    circle.fillCircle(x + 30, y + CARD_H / 2, 21);
    circle.lineStyle(2, 0xffffff, 0.4);
    circle.strokeCircle(x + 30, y + CARD_H / 2, 21);

    // isim
    this.add.text(x + 60, y + 10, cfg.name, {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setDepth(2);

    // HP & Hız
    this.add.text(x + 60, y + 30, `HP ${cfg.hp}   Hız ${cfg.speed}`, {
      fontSize: '11px', color: '#aaaaaa',
    }).setDepth(2);

    // Yetenek
    this.add.text(x + 60, y + 48, `⚡ ${cfg.abilityName}  (${cfg.abilityCooldown}s CD)`, {
      fontSize: '11px', color: '#ffdd44',
    }).setDepth(2);

    // Açıklama
    this.add.text(x + 60, y + 66, cfg.description, {
      fontSize: '10px', color: '#888888',
      wordWrap: { width: CARD_W - 66 },
    }).setDepth(2);

    // Hit zone
    this.add.zone(x, y, CARD_W, CARD_H).setOrigin(0).setDepth(5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.selectHero(cfg.key, x, y))
      .on('pointerover', () => {
        if (this.selectedKey !== cfg.key) this.drawCardBg(bg, x, y, true);
      })
      .on('pointerout', () => {
        if (this.selectedKey !== cfg.key) this.drawCardBg(bg, x, y, false);
      });
  }

  private drawCardBg(gfx: Phaser.GameObjects.Graphics, x: number, y: number, hover: boolean) {
    gfx.clear();
    gfx.fillStyle(hover ? 0x252545 : 0x181828, 1);
    gfx.fillRoundedRect(x, y, CARD_W, CARD_H, 8);
    gfx.lineStyle(1, hover ? 0x666688 : 0x333344, 1);
    gfx.strokeRoundedRect(x, y, CARD_W, CARD_H, 8);
  }

  private selectHero(key: string, x: number, y: number) {
    // önceki bg'yi sıfırla
    if (this.selectedKey) {
      const idx = HERO_CONFIGS.findIndex(h => h.key === this.selectedKey);
      const col = idx % 2, row = Math.floor(idx / 2);
      const px = START_X + col * (CARD_W + GAP);
      const py = START_Y + row * (CARD_H + GAP);
      const prevBg = this.cardBgs.get(this.selectedKey!);
      if (prevBg) this.drawCardBg(prevBg, px, py, false);
    }

    this.selectedKey = key;

    // vurgu kenarlık
    this.selBorder.clear();
    this.selBorder.lineStyle(3, 0xffdd00, 1);
    this.selBorder.strokeRoundedRect(x, y, CARD_W, CARD_H, 8);

    // kart bg seçili renk
    const bg = this.cardBgs.get(key)!;
    bg.clear();
    bg.fillStyle(0x2a2a15, 1);
    bg.fillRoundedRect(x, y, CARD_W, CARD_H, 8);
    bg.lineStyle(1, 0x666600, 1);
    bg.strokeRoundedRect(x, y, CARD_W, CARD_H, 8);

    // Oyna butonunu aktif et
    this.playBtn.setColor('#ffdd00').setBackgroundColor('#333300');
  }
}
