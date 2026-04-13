import { Room, Client } from 'colyseus';
import { Schema, type } from '@colyseus/schema';

// ─── LobbyState ───────────────────────────────────────────────────────────

class LobbyState extends Schema {
  @type('string') roomCode: string = '';
  @type('number') playerCount: number = 0;
  @type('boolean') gameStarted: boolean = false;
}

// ─── LobbyRoom ────────────────────────────────────────────────────────────

const MAX_PLAYERS = 3;

export class LobbyRoom extends Room<LobbyState> {
  maxClients = MAX_PLAYERS;

  onCreate(options: { code?: string }) {
    this.setState(new LobbyState());

    // Use provided code (join by code) or generate a new one
    this.state.roomCode = options.code ?? this.generateCode();

    // Allow searching by room code
    this.setMetadata({ code: this.state.roomCode });

    this.onMessage('start_game', (client) => {
      if (this.state.playerCount < 2) {
        client.send('notification', { msg: 'En az 2 oyuncu gerekli!' });
        return;
      }
      this.state.gameStarted = true;
      this.broadcast('start_game', { code: this.state.roomCode });
    });

    this.onMessage('chat', (client, data: { text: string }) => {
      this.broadcast('chat', {
        from: client.sessionId,
        text: data.text.slice(0, 120), // limit
      });
    });

    console.log(`[LobbyRoom] Created — code: ${this.state.roomCode}`);
  }

  onJoin(client: Client) {
    this.state.playerCount++;
    console.log(`[LobbyRoom] ${client.sessionId} joined. Players: ${this.state.playerCount}`);
    this.broadcast('player_joined', { sessionId: client.sessionId, count: this.state.playerCount });
  }

  onLeave(client: Client) {
    this.state.playerCount = Math.max(0, this.state.playerCount - 1);
    console.log(`[LobbyRoom] ${client.sessionId} left. Players: ${this.state.playerCount}`);
    this.broadcast('player_left', { sessionId: client.sessionId, count: this.state.playerCount });
  }

  onDispose() {
    console.log(`[LobbyRoom] Disposed — code: ${this.state.roomCode}`);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
