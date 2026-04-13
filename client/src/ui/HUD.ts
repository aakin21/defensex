import Phaser from 'phaser';
import type { HeroConfig } from '../entities/HeroConfig';

export interface HUDUpdateData {
  heroHp: number;
  heroMaxHp: number;
  gold: number;
  wave: number;
  enemiesLeft: number;
  phase: 'prep' | 'wave';
  prepTimeLeftMs: number;
  baseHp: number;
  baseMaxHp: number;
}

const DEPTH = 150;

export class HUD {
  private scene: Phaser.Scene;
  private heroConfig: HeroConfig;

  // Hero paneli (sol üst)
  private heroPanelBg!: Phaser.GameObjects.Rectangle;
  private heroCircle!: Phaser.GameObjects.Arc;
  private heroNameTxt!: Phaser.GameObjects.Text;
  private heroHpGfx!: Phaser.GameObjects.Graphics;
  private heroHpTxt!: Phaser.GameObjects.Text;

  // Üst bilgi barı (altın / wave / düşman)
  private infoBg!: Phaser.GameObjects.Rectangle;
  private goldTxt!: Phaser.GameObjects.Text;
  private waveTxt!: Phaser.GameObjects.Text;
  private enemyTxt!: Phaser.GameObjects.Text;

  // Prep geri sayım
  private prepBg!: Phaser.GameObjects.Rectangle;
  private prepTxt!: Phaser.GameObjects.Text;

  // Base HP barı (alt orta-sol)
  private baseHpBg!: Phaser.GameObjects.Graphics;
  private baseHpBar!: Phaser.GameObjects.Graphics;
  private baseLabel!: Phaser.GameObjects.Text;
  private baseHpTxt!: Phaser.GameObjects.Text;

  // Hızlı komut butonları (sol alt, joystick üstü)
  private quickBtns: Phaser.GameObjects.Text[] = [];

  /** GameScene'e komut bildirimi */
  onQuickCommand?: (cmd: string) => void;

  constructor(scene: Phaser.Scene, heroConfig: HeroConfig) {
    this.scene = scene;
    this.heroConfig = heroConfig;
    this.buildHeroPanel();
    this.buildInfoBar();
    this.buildPrepTimer();
    this.buildBaseHpBar();
    this.buildQuickCommands();
  }

  // ---- Hero Paneli (sol üst) ----

  private buildHeroPanel() {
    const x = 8, y = 8, w = 168, h = 52;

    this.heroPanelBg = this.scene.add
      .rectangle(x, y, w, h, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // hero renk dairesi
    this.heroCircle = this.scene.add
      .arc(x + 26, y + 26, 18, 0, 360, false, this.heroConfig.color, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // isim
    this.heroNameTxt = this.scene.add
      .text(x + 50, y + 6, this.heroConfig.displayName, {
        fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // HP bar grafik
    this.heroHpGfx = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // HP yazısı
    this.heroHpTxt = this.scene.add
      .text(x + 50, y + 34, '', { fontSize: '10px', color: '#aaffaa' })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  private drawHeroHpBar(hp: number, maxHp: number) {
    const x = 8 + 50, y = 8 + 20;
    const W = 110, H = 10;
    const frac = hp / maxHp;
    const col = frac > 0.5 ? 0x44ff44 : frac > 0.25 ? 0xffaa00 : 0xff3333;

    this.heroHpGfx.clear();
    this.heroHpGfx.fillStyle(0x222222, 0.8);
    this.heroHpGfx.fillRect(x, y, W, H);
    this.heroHpGfx.fillStyle(col, 1);
    this.heroHpGfx.fillRect(x, y, W * frac, H);
    this.heroHpTxt.setText(`${hp} / ${maxHp}`);
  }

  // ---- Üst Bilgi Barı ----

  private buildInfoBar() {
    const { width } = this.scene.scale;
    const cx = width / 2;
    const y = 8, w = 200, h = 52;

    this.infoBg = this.scene.add
      .rectangle(cx, y, w, h, 0x000000, 0.55)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // Altın (sol)
    this.goldTxt = this.scene.add
      .text(cx - 70, y + 8, '🪙 200', { fontSize: '14px', color: '#ffdd44' })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // Wave (orta)
    this.waveTxt = this.scene.add
      .text(cx, y + 8, 'Wave 1', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // Kalan düşman (sağ)
    this.enemyTxt = this.scene.add
      .text(cx + 68, y + 8, '👾 0', { fontSize: '13px', color: '#ff8888' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  // ---- Prep Geri Sayım ----

  private buildPrepTimer() {
    const { width } = this.scene.scale;
    const cx = width / 2;

    this.prepBg = this.scene.add
      .rectangle(cx, 68, 180, 30, 0x330000, 0.8)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    this.prepTxt = this.scene.add
      .text(cx, 83, 'HAZIRLIK  30s', {
        fontSize: '14px', color: '#ff4444', fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);
  }

  // ---- Base HP Barı (alt orta-sol) ----

  private buildBaseHpBar() {
    const { height } = this.scene.scale;
    const BAR_W = 240, BAR_H = 14;
    const BX = 10, BY = height - 36;

    this.baseHpBg = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH);

    this.baseHpBar = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    this.baseLabel = this.scene.add
      .text(BX, BY - 16, 'ANA BASE', {
        fontSize: '11px', color: '#ffdd44', fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    this.baseHpTxt = this.scene.add
      .text(BX + BAR_W + 6, BY + BAR_H / 2, '5000 / 5000', {
        fontSize: '10px', color: '#cccccc',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // arka plan çiz (sabıt)
    this.baseHpBg.fillStyle(0x222222, 0.85);
    this.baseHpBg.fillRect(BX, BY, BAR_W, BAR_H);
  }

  private drawBaseHpBar(hp: number, maxHp: number) {
    const { height } = this.scene.scale;
    const BAR_W = 240, BAR_H = 14;
    const BX = 10, BY = height - 36;
    const frac = hp / maxHp;
    const col = frac > 0.5 ? 0x44dd44 : frac > 0.25 ? 0xffaa00 : 0xff2222;

    this.baseHpBar.clear();
    this.baseHpBar.fillStyle(col, 1);
    this.baseHpBar.fillRect(BX, BY, BAR_W * frac, BAR_H);
    this.baseHpTxt.setText(`${hp} / ${maxHp}`);
  }

  // ---- Hızlı Komut Butonları ----

  private buildQuickCommands() {
    const { height } = this.scene.scale;
    const CMDS = ['Buraya Gel!', 'Dikkat!', 'İyi İş!', 'Yardım!'];
    const BTN_W = 72, BTN_H = 26, GAP = 5;
    const startX = 8, startY = height - 245;

    CMDS.forEach((cmd, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (BTN_W + GAP);
      const y = startY + row * (BTN_H + GAP);

      const btn = this.scene.add
        .text(x + BTN_W / 2, y + BTN_H / 2, cmd, {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 4, y: 4 },
          fixedWidth: BTN_W,
          align: 'center',
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => this.onQuickCommand?.(cmd));
      btn.on('pointerover', () => btn.setColor('#ffdd00'));
      btn.on('pointerout',  () => btn.setColor('#ffffff'));

      this.quickBtns.push(btn);
    });
  }

  // ---- Güncelleme ----

  update(d: HUDUpdateData) {
    this.drawHeroHpBar(d.heroHp, d.heroMaxHp);

    // Altın (animasyonlu renk değişimi)
    this.goldTxt.setText(`🪙 ${d.gold}`);
    this.goldTxt.setColor(d.gold < 50 ? '#ff8888' : '#ffdd44');

    // Wave & düşman
    this.waveTxt.setText(`Wave ${d.wave}`);
    this.enemyTxt.setText(`👾 ${d.enemiesLeft}`);

    // Prep timer
    const isPrep = d.phase === 'prep';
    this.prepBg.setVisible(isPrep);
    this.prepTxt.setVisible(isPrep);
    if (isPrep) {
      const secs = Math.ceil(d.prepTimeLeftMs / 1000);
      this.prepTxt.setText(`HAZIRLIK  ${secs}s`);
    }

    // Base HP barı
    this.drawBaseHpBar(d.baseHp, d.baseMaxHp);
  }
}
