import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { LobbyRoom } from './rooms/LobbyRoom';
import { GameRoom } from './rooms/GameRoom';
import { authRouter } from './routes/auth';

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.use(express.json());

// ─── REST routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ─── Colyseus monitor (dev only) ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/colyseus', monitor());
}

// ─── Colyseus server ──────────────────────────────────────────────────────
const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('lobby', LobbyRoom);
gameServer.define('game',  GameRoom).enableRealtimeListing();

gameServer.listen(PORT).then(() => {
  console.log(`[Fortress Fantasy Server] Listening on ws://localhost:${PORT}`);
  console.log(`[Colyseus Monitor]        http://localhost:${PORT}/colyseus`);
});
