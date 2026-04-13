import * as Colyseus from 'colyseus.js';
import type { Room } from 'colyseus.js';

// Server URL — production'da env variable ile override edilir
const SERVER_URL = (import.meta as { env?: { VITE_SERVER_URL?: string } }).env?.VITE_SERVER_URL
  ?? 'ws://localhost:2567';

const REST_URL = SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://');

// ─── Singleton ────────────────────────────────────────────────────────────

class NetworkManagerClass {
  private client: Colyseus.Client;
  private _lobbyRoom: Room | null = null;
  private _gameRoom:  Room | null = null;

  // Kimlik doğrulama
  token:    string | null = null;
  username: string | null = null;
  sessionId: string | null = null;

  constructor() {
    this.client = new Colyseus.Client(SERVER_URL);
  }

  // ─── REST Auth ──────────────────────────────────────────────────────────

  async register(username: string, password: string): Promise<{ ok: boolean; msg: string }> {
    try {
      const res = await fetch(`${REST_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (data.token) {
        this.token    = data.token;
        this.username = username;
        return { ok: true, msg: '' };
      }
      return { ok: false, msg: data.error ?? 'Kayıt başarısız' };
    } catch {
      return { ok: false, msg: 'Sunucuya bağlanılamadı' };
    }
  }

  async login(username: string, password: string): Promise<{ ok: boolean; msg: string }> {
    try {
      const res = await fetch(`${REST_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (data.token) {
        this.token    = data.token;
        this.username = username;
        return { ok: true, msg: '' };
      }
      return { ok: false, msg: data.error ?? 'Giriş başarısız' };
    } catch {
      return { ok: false, msg: 'Sunucuya bağlanılamadı' };
    }
  }

  // ─── Lobby ──────────────────────────────────────────────────────────────

  async createLobby(): Promise<{ ok: boolean; code: string; msg: string }> {
    try {
      this._lobbyRoom = await this.client.create('lobby');
      const code = (this._lobbyRoom.state as { roomCode?: string }).roomCode ?? '';
      return { ok: true, code, msg: '' };
    } catch (e) {
      return { ok: false, code: '', msg: String(e) };
    }
  }

  async joinLobby(code: string): Promise<{ ok: boolean; msg: string }> {
    try {
      const rooms = await this.client.getAvailableRooms('lobby');
      const target = rooms.find(r => (r.metadata as { code?: string })?.code === code.toUpperCase());
      if (!target) return { ok: false, msg: 'Oda bulunamadı' };
      this._lobbyRoom = await this.client.joinById(target.roomId);
      return { ok: true, msg: '' };
    } catch (e) {
      return { ok: false, msg: String(e) };
    }
  }

  get lobbyRoom(): Room | null { return this._lobbyRoom; }

  // ─── Game ───────────────────────────────────────────────────────────────

  async joinGame(heroType: string): Promise<{ ok: boolean; msg: string }> {
    try {
      // Lobby kodu ile aynı game room'a katıl
      const lobbyCode = (this._lobbyRoom?.state as { roomCode?: string })?.roomCode;
      this._gameRoom = await this.client.joinOrCreate('game', {
        heroType,
        username: this.username ?? 'Player',
        lobbyCode,
      });
      this.sessionId = this._gameRoom.sessionId;
      return { ok: true, msg: '' };
    } catch (e) {
      return { ok: false, msg: String(e) };
    }
  }

  get gameRoom(): Room | null { return this._gameRoom; }

  // ─── Mesaj gönderme (GameRoom) ──────────────────────────────────────────

  sendHeroMove(dx: number, dy: number, delta: number) {
    this._gameRoom?.send('hero_move', { dx, dy, delta });
  }

  sendHeroAbility() {
    this._gameRoom?.send('hero_ability');
  }

  sendHeroAttack(targetId: string) {
    this._gameRoom?.send('hero_attack', { targetId });
  }

  sendBuyBuilding(buildingType: string, x: number, y: number) {
    this._gameRoom?.send('buy_building', { buildingType, x, y });
  }

  sendUpgradeBuilding(buildingId: string) {
    this._gameRoom?.send('upgrade_building', { buildingId });
  }

  sendBuyBot(botType: string, x: number, y: number) {
    this._gameRoom?.send('buy_bot', { botType, x, y });
  }

  // ─── Temizlik ────────────────────────────────────────────────────────────

  leaveGame() {
    this._gameRoom?.leave();
    this._gameRoom = null;
  }

  leaveLobby() {
    this._lobbyRoom?.leave();
    this._lobbyRoom = null;
  }

  leaveAll() {
    this.leaveGame();
    this.leaveLobby();
  }
}

export const NetworkManager = new NetworkManagerClass();
