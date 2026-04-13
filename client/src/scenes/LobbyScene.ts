import Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ─── LobbyScene ──────────────────────────────────────────────────────────
// Oda oluştur / oda koduna katıl / oyuncuları bekle / oyunu başlat

export class LobbyScene extends Phaser.Scene {
  private containerDiv!: HTMLDivElement;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 60, 'FORTRESS FANTASY', {
      fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildUI(width, height);
  }

  // ─── Ana UI ──────────────────────────────────────────────────────────────

  private buildUI(width: number, height: number) {
    this.containerDiv = document.createElement('div');
    Object.assign(this.containerDiv.style, {
      position:  'absolute',
      top:       `${height * 0.12}px`,
      left:      '50%',
      transform: 'translateX(-50%)',
      width:     '300px',
      display:   'flex',
      flexDirection: 'column',
      gap:       '14px',
      zIndex:    '10',
    });

    const createBtn = this.makeButton('Oda Oluştur', '#4466cc');
    const divider   = this.makeLabel('— veya —', '#888888');
    const codeInput = this.makeInput('Oda Kodu (6 hane)', 'text');
    codeInput.maxLength = 6;
    codeInput.style.textTransform = 'uppercase';
    const joinBtn   = this.makeButton('Odaya Katıl', '#336633');
    const backBtn   = this.makeButton('Geri', '#555555');
    const msgEl     = this.makeMsg();

    createBtn.onclick = () => this.handleCreate(msgEl);
    joinBtn.onclick   = () => this.handleJoin(codeInput.value.trim().toUpperCase(), msgEl);
    backBtn.onclick   = () => { this.cleanup(); this.scene.start('MenuScene'); };

    this.containerDiv.append(createBtn, divider, codeInput, joinBtn, backBtn, msgEl);
    document.body.appendChild(this.containerDiv);

    this.events.once('shutdown', () => this.cleanup());
  }

  // ─── Oda oluştur ─────────────────────────────────────────────────────────

  private async handleCreate(msgEl: HTMLDivElement) {
    msgEl.textContent = 'Oda oluşturuluyor...';
    const result = await NetworkManager.createLobby();
    if (!result.ok) { msgEl.textContent = result.msg; return; }
    msgEl.textContent = '';
    this.showWaitingRoom(result.code, true);
  }

  // ─── Odaya katıl ─────────────────────────────────────────────────────────

  private async handleJoin(code: string, msgEl: HTMLDivElement) {
    if (code.length !== 6) { msgEl.textContent = 'Geçerli bir 6 haneli kod gir'; return; }
    msgEl.textContent = 'Bağlanılıyor...';
    const result = await NetworkManager.joinLobby(code);
    if (!result.ok) { msgEl.textContent = result.msg; return; }
    msgEl.textContent = '';
    this.showWaitingRoom(code, false);
  }

  // ─── Bekleme odası ────────────────────────────────────────────────────────

  private showWaitingRoom(code: string, isHost: boolean) {
    // Mevcut UI'ı temizle
    while (this.containerDiv.firstChild) this.containerDiv.removeChild(this.containerDiv.firstChild);

    const codeLabel   = this.makeLabel(`Oda Kodu: ${code}`, '#ffdd00', '22px');
    codeLabel.style.fontWeight = 'bold';
    codeLabel.style.textAlign  = 'center';

    const playerList  = this.makeLabel('Oyuncular: 1', '#cccccc');
    playerList.style.textAlign = 'center';

    const msgEl = this.makeMsg();
    msgEl.textContent = 'Oyuncular bekleniyor...';
    msgEl.style.color = '#88ccff';

    const startBtn = isHost ? this.makeButton('Oyunu Başlat', '#cc6600') : null;
    if (startBtn) startBtn.style.opacity = '0.5'; // at least 2 players needed

    const leaveBtn = this.makeButton('Çık', '#555555');

    // State dinle
    const lobby = NetworkManager.lobbyRoom;
    if (lobby) {
      // Oyuncu sayısı değişince güncelle
      (lobby.state as { onChange?: (cb: () => void) => void }).onChange?.(() => {
        const count = (lobby.state as { playerCount?: number }).playerCount ?? 1;
        playerList.textContent = `Oyuncular: ${count}`;
        if (startBtn) startBtn.style.opacity = count >= 2 ? '1' : '0.5';
      });

      // Manuel onChange yoksa interval ile kontrol
      const interval = setInterval(() => {
        const count = (lobby.state as { playerCount?: number }).playerCount ?? 1;
        playerList.textContent = `Oyuncular: ${count}`;
        if (startBtn) startBtn.style.opacity = count >= 2 ? '1' : '0.5';
      }, 1000);
      this.events.once('shutdown', () => clearInterval(interval));

      // Host "start_game" mesajına tepki ver
      lobby.onMessage('start_game', () => {
        this.cleanup();
        this.scene.start('HeroSelectScene', { fromLobby: true });
      });
    }

    if (startBtn) {
      startBtn.onclick = () => {
        const count = (lobby?.state as { playerCount?: number })?.playerCount ?? 1;
        if (count < 2) { msgEl.textContent = 'En az 2 oyuncu gerekli!'; msgEl.style.color = '#ff6666'; return; }
        lobby?.send('start_game', {});
      };
    }

    leaveBtn.onclick = () => {
      NetworkManager.leaveLobby();
      this.cleanup();
      this.scene.start('LobbyScene');
    };

    const items: HTMLElement[] = [codeLabel, playerList, msgEl];
    if (startBtn) items.push(startBtn);
    items.push(leaveBtn);
    this.containerDiv.append(...items);
  }

  // ─── Yardımcılar ─────────────────────────────────────────────────────────

  private makeButton(text: string, bg: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      background: bg,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    });
    return btn;
  }

  private makeInput(placeholder: string, type: string): HTMLInputElement {
    const el = document.createElement('input');
    el.type = type;
    el.placeholder = placeholder;
    Object.assign(el.style, {
      padding: '10px',
      fontSize: '15px',
      borderRadius: '6px',
      border: '1px solid #555',
      background: '#1a1a2e',
      color: '#ffffff',
      outline: 'none',
      letterSpacing: '2px',
      textAlign: 'center',
    });
    return el;
  }

  private makeLabel(text: string, color: string, fontSize = '14px'): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, { color, fontSize });
    return el;
  }

  private makeMsg(): HTMLDivElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      color: '#ff6666', fontSize: '13px', textAlign: 'center', minHeight: '18px',
    });
    return el;
  }

  private cleanup() {
    this.containerDiv?.remove();
  }
}
