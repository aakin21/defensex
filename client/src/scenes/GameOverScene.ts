import Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

interface GameOverData {
  wave?:        number;
  kills?:       number;
  deaths?:      number;
  damageDealt?: number;
}

export class GameOverScene extends Phaser.Scene {
  private gameData!: Required<GameOverData>;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData) {
    this.gameData = {
      wave:        data.wave        ?? 0,
      kills:       data.kills       ?? 0,
      deaths:      data.deaths      ?? 0,
      damageDealt: data.damageDealt ?? 0,
    };
  }

  create() {
    const { width, height } = this.scale;
    const d = this.gameData;

    // İstatistikleri server'a gönder
    this.saveStats(d);

    // ─── Arka plan ───────────────────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    // ─── Başlık ──────────────────────────────────────────────────────────
    this.add.text(width / 2, 90, 'OYUN BİTTİ', {
      fontSize: '48px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    // ─── İstatistik kartı ────────────────────────────────────────────────
    const cardX = width / 2;
    const cardY = height / 2 - 20;
    const cardW = 320;
    const cardH = 200;

    const card = this.add.graphics();
    card.fillStyle(0x1a1a2e, 0.95);
    card.fillRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 12);
    card.lineStyle(2, 0x4466cc, 1);
    card.strokeRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 12);

    const username = NetworkManager.username ?? 'Sen';
    this.add.text(cardX, cardY - cardH / 2 + 22, username, {
      fontSize: '18px', color: '#ffdd00', fontStyle: 'bold',
    }).setOrigin(0.5);

    const stats: [string, string | number][] = [
      ['Ulaşılan Wave',  d.wave],
      ['Öldürülen Düşman', d.kills],
      ['Ölüm Sayısı',    d.deaths],
      ['Verilen Hasar',  d.damageDealt],
    ];

    stats.forEach(([label, value], i) => {
      const rowY = cardY - 30 + i * 36;
      this.add.text(cardX - 120, rowY, label, {
        fontSize: '14px', color: '#aaaaaa',
      }).setOrigin(0, 0.5);
      this.add.text(cardX + 120, rowY, String(value), {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(1, 0.5);
    });

    // ─── Butonlar ────────────────────────────────────────────────────────
    const replayBtn = this.add.text(width / 2 - 90, height - 140, 'Tekrar Oyna', {
      fontSize: '22px', color: '#44ff88',
      backgroundColor: '#1a3a2a',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerdown', () => this.scene.start('LobbyScene'));
    replayBtn.on('pointerover', () => replayBtn.setColor('#ffffff'));
    replayBtn.on('pointerout',  () => replayBtn.setColor('#44ff88'));

    const menuBtn = this.add.text(width / 2 + 90, height - 140, 'Ana Menü', {
      fontSize: '22px', color: '#ffdd00',
      backgroundColor: '#2a2a1a',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#ffdd00'));
  }

  private saveStats(d: Required<GameOverData>) {
    if (!NetworkManager.token) return;
    void fetch(`${this.getRestUrl()}/api/auth/stats`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${NetworkManager.token}`,
      },
      body: JSON.stringify({
        wave:        d.wave,
        kills:       d.kills,
        deaths:      d.deaths,
        damageDealt: d.damageDealt,
      }),
    }).catch(() => { /* sessizce görmezden gel */ });
  }

  private getRestUrl(): string {
    const serverUrl = (import.meta as { env?: { VITE_SERVER_URL?: string } }).env?.VITE_SERVER_URL ?? 'ws://localhost:2567';
    return serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
  }
}
