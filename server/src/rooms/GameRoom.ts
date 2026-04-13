import { Room, Client } from 'colyseus';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  PlayerState,
  BuildingState,
  BotUnitState,
  EnemyState,
} from '../schemas/GameState';
import {
  GOLD_START,
  GOLD_REWARDS,
  WAVE_BONUS_BASE,
  BUILDING_STATS,
  BOT_STATS,
  ENEMY_STATS,
  HERO_STATS,
  BASE_MAX_HP,
  BOT_LIMIT,
  PREP_DURATION_MS,
  HERO_RESPAWN_MS,
  getWaveComposition,
  MAP_COLS,
  MAP_ROWS,
  MAP_TILE_SIZE,
  TERRAIN_SPEED,
} from '../../../shared/types';
import type {
  BuildingType,
  BotUnitType,
  EnemyType,
  HeroType,
} from '../../../shared/types';
import { AStarPathfinder } from '../systems/AStarPathfinder';
import { WaveSpawner } from '../systems/WaveSpawner';

interface EnemyTarget {
  x: number;
  y: number;
  id?: string;
  kind: 'building' | 'bot' | 'hero' | 'base';
}

const MAP_WIDTH  = MAP_COLS * MAP_TILE_SIZE; // 2048
const MAP_HEIGHT = MAP_ROWS * MAP_TILE_SIZE;
const BASE_X     = MAP_WIDTH  / 2;
const BASE_Y     = MAP_HEIGHT / 2;
const TICK_MS    = 100; // server tick: 10 FPS

// ─── GameRoom ─────────────────────────────────────────────────────────────

export class GameRoom extends Room<GameState> {
  maxClients = 3;

  private pathfinder!: AStarPathfinder;
  private waveSpawner!: WaveSpawner;

  // Per-enemy patrol / path data (not in schema — server-only)
  private enemyPaths: Map<string, { path: {x:number,y:number}[]; step: number }> = new Map();
  private enemyAttackTimers: Map<string, number> = new Map();

  // Building attack timers (id → ms since last shot)
  private buildingAttackTimers: Map<string, number> = new Map();

  // Bot attack timers
  private botAttackTimers: Map<string, number> = new Map();

  onCreate(options: unknown) {
    this.setState(new GameState());
    this.state.sharedGold = GOLD_START;
    this.state.baseHP     = BASE_MAX_HP;
    this.state.phase      = 'prep';
    this.state.prepTimer  = PREP_DURATION_MS;

    this.pathfinder = new AStarPathfinder();
    this.waveSpawner = new WaveSpawner();

    this.registerMessages();
    this.setSimulationInterval((dt) => this.tick(dt), TICK_MS);

    console.log('[GameRoom] Created');
  }

  onJoin(client: Client, options: { heroType?: HeroType; username?: string }) {
    const heroType = options.heroType ?? 'Paladin';
    const stats    = HERO_STATS[heroType];

    const player = new PlayerState();
    player.id        = client.sessionId;
    player.sessionId = client.sessionId;
    player.username  = options.username ?? `Player${this.state.players.size + 1}`;
    player.heroType  = heroType;
    player.hp        = stats.maxHp;
    player.maxHp     = stats.maxHp;
    player.x         = BASE_X;
    player.y         = BASE_Y - 80;

    this.state.players.set(client.sessionId, player);
    console.log(`[GameRoom] ${client.sessionId} joined as ${heroType}`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    console.log(`[GameRoom] ${client.sessionId} left`);
  }

  onDispose() {
    console.log('[GameRoom] Disposed');
  }

  // ─── Message Handlers ──────────────────────────────────────────────────

  private registerMessages() {
    // ── Hero movement (client sends dx/dy every frame) ──
    this.onMessage('hero_move', (client, data: { dx: number; dy: number; delta: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;

      const stats = HERO_STATS[player.heroType as HeroType];
      const dt    = Math.min(data.delta, 200) / 1000;
      const len   = Math.sqrt(data.dx * data.dx + data.dy * data.dy) || 1;

      player.x = Math.max(0, Math.min(MAP_WIDTH,  player.x + (data.dx / len) * stats.moveSpeed * dt));
      player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y + (data.dy / len) * stats.moveSpeed * dt));
    });

    // ── Hero ability ──
    this.onMessage('hero_ability', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      this.applyHeroAbility(player);
    });

    // ── Hero attacks enemy ──
    this.onMessage('hero_attack', (client, data: { targetId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      const enemy = this.state.enemies.get(data.targetId);
      if (!enemy || enemy.isDead) return;

      const stats = HERO_STATS[player.heroType as HeroType];
      this.dealDamageToEnemy(enemy, stats.damage, player.sessionId);
    });

    // ── Buy building ──
    this.onMessage('buy_building', (client, data: { buildingType: BuildingType; x: number; y: number }) => {
      const lv0     = BUILDING_STATS[data.buildingType][0];
      if (!lv0) return;

      if (this.state.sharedGold < lv0.cost) {
        client.send('notification', { msg: `Yetersiz altın! (${lv0.cost}g gerekli)` });
        return;
      }

      if (!this.canPlaceBuilding(data.x, data.y)) {
        client.send('notification', { msg: 'Buraya bina koyulamaz!' });
        return;
      }

      this.state.sharedGold -= lv0.cost;

      const b = new BuildingState();
      b.id           = uuidv4();
      b.ownerId      = client.sessionId;
      b.buildingType = data.buildingType;
      b.x            = data.x;
      b.y            = data.y;
      b.hp           = lv0.hp;
      b.maxHp        = lv0.hp;
      b.level        = 1;

      this.state.buildings.set(b.id, b);
    });

    // ── Upgrade building ──
    this.onMessage('upgrade_building', (client, data: { buildingId: string }) => {
      const b = this.state.buildings.get(data.buildingId);
      if (!b || b.isDestroyed) return;

      const levels = BUILDING_STATS[b.buildingType as BuildingType];
      if (b.level >= levels.length) {
        client.send('notification', { msg: 'Maksimum seviyeye ulaşıldı!' });
        return;
      }

      const upgradeCost = levels[b.level].cost; // next level cost
      if (this.state.sharedGold < upgradeCost) {
        client.send('notification', { msg: `Yetersiz altın! (${upgradeCost}g gerekli)` });
        return;
      }

      this.state.sharedGold -= upgradeCost;
      b.level++;
      const newStats = levels[b.level - 1];
      b.maxHp = newStats.hp;
      b.hp    = newStats.hp; // full heal on upgrade
    });

    // ── Buy bot ──
    this.onMessage('buy_bot', (client, data: { botType: BotUnitType; x: number; y: number }) => {
      const stats = BOT_STATS[data.botType];
      if (!stats) return;

      const aliveBots = [...this.state.botUnits.values()].filter(b => !b.isDead).length;
      if (aliveBots >= BOT_LIMIT) {
        client.send('notification', { msg: `Bot limiti doldu! (max ${BOT_LIMIT})` });
        return;
      }

      if (this.state.sharedGold < stats.cost) {
        client.send('notification', { msg: `Yetersiz altın! (${stats.cost}g gerekli)` });
        return;
      }

      this.state.sharedGold -= stats.cost;

      const bot = new BotUnitState();
      bot.id      = uuidv4();
      bot.ownerId = client.sessionId;
      bot.botType = data.botType;
      bot.x       = data.x;
      bot.y       = data.y;
      bot.hp      = stats.maxHp;
      bot.maxHp   = stats.maxHp;

      this.state.botUnits.set(bot.id, bot);
    });

    // ── Quick command (relay to other players) ──
    this.onMessage('quick_command', (client, data: { cmd: string }) => {
      this.broadcast('quick_command', { from: client.sessionId, cmd: data.cmd }, { except: client });
    });
  }

  // ─── Main Tick ─────────────────────────────────────────────────────────

  private tick(dt: number) {
    if (this.state.gameOver) return;

    if (this.state.phase === 'prep') {
      this.tickPrep(dt);
    } else if (this.state.phase === 'wave') {
      this.tickWave(dt);
      this.tickEnemyAI(dt);
      this.tickBuildings(dt);
      this.tickBots(dt);
    }

    this.tickRespawns();
  }

  // ─── Prep Phase ────────────────────────────────────────────────────────

  private tickPrep(dt: number) {
    this.state.prepTimer -= dt;
    if (this.state.prepTimer <= 0) {
      this.state.prepTimer = 0;
      this.startWave();
    }
  }

  private startWave() {
    this.state.phase = 'wave';
    const waveNo = this.state.currentWave;
    this.broadcast('wave_start', { waveNo });
    this.waveSpawner.spawn(waveNo, (type, x, y, hp) => {
      const enemy = new EnemyState();
      enemy.id        = uuidv4();
      enemy.enemyType = type;
      enemy.x         = x;
      enemy.y         = y;
      enemy.hp        = hp;
      enemy.maxHp     = hp;
      this.state.enemies.set(enemy.id, enemy);
      this.enemyAttackTimers.set(enemy.id, 0);
    });
    console.log(`[GameRoom] Wave ${waveNo} started`);
  }

  // ─── Wave Phase ────────────────────────────────────────────────────────

  private tickWave(dt: number) {
    // Process pending spawns
    this.waveSpawner.tick(dt);

    // Check if all enemies dead → prep
    const aliveEnemies = [...this.state.enemies.values()].filter(e => !e.isDead);
    if (aliveEnemies.length === 0 && !this.waveSpawner.hasPendingSpawns()) {
      this.endWave();
    }
  }

  private endWave() {
    const waveNo = this.state.currentWave;
    // Wave completion gold
    const bonus = WAVE_BONUS_BASE + waveNo * 10;
    this.state.sharedGold += bonus;
    this.broadcast('notification', { msg: `Wave ${waveNo} bitti! +${bonus}g` });

    // Clean up dead enemies
    for (const [id, e] of this.state.enemies) {
      if (e.isDead) this.state.enemies.delete(id);
    }

    this.state.currentWave++;
    this.state.phase     = 'prep';
    this.state.prepTimer = PREP_DURATION_MS;
    this.enemyPaths.clear();
    console.log(`[GameRoom] Wave ${waveNo} ended. Next: ${this.state.currentWave}`);
  }

  // ─── Enemy AI ──────────────────────────────────────────────────────────

  private tickEnemyAI(dt: number) {
    for (const [id, enemy] of this.state.enemies) {
      if (enemy.isDead) continue;

      const stats   = ENEMY_STATS[enemy.enemyType as EnemyType];
      const speed   = stats.moveSpeed * (dt / 1000);

      // Find nearest target: wall/building → bot → hero → base
      const target = this.findEnemyTarget(enemy);

      if (target) {
        const dx   = target.x - enemy.x;
        const dy   = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const attackRange = 50;
        if (dist <= attackRange) {
          // Attack target
          const timer = (this.enemyAttackTimers.get(id) ?? 0) - dt;
          this.enemyAttackTimers.set(id, timer);
          if (timer <= 0) {
            this.enemyAttackTimers.set(id, 1500); // 1.5s attack speed
            this.applyEnemyAttack(enemy, target);
          }
        } else {
          // Move toward target (simple straight-line, pathfinder used for base)
          enemy.x += (dx / dist) * speed;
          enemy.y += (dy / dist) * speed;
        }
      } else {
        // No target in range — pathfind toward base
        this.moveEnemyTowardBase(enemy, speed, id);
      }
    }
  }

  private findEnemyTarget(enemy: EnemyState): EnemyTarget | null {
    const SIGHT = 300;
    let nearest: EnemyTarget | null = null;
    let bestDist = SIGHT;

    // 1. Nearest building in sight
    for (const [, b] of this.state.buildings) {
      if (b.isDestroyed) continue;
      const d = this.dist(enemy, b);
      if (d < bestDist) { bestDist = d; nearest = { x: b.x, y: b.y, id: b.id, kind: 'building' }; }
    }
    if (nearest) return nearest;

    bestDist = SIGHT;

    // 2. Nearest bot in sight
    for (const [, bot] of this.state.botUnits) {
      if (bot.isDead) continue;
      const d = this.dist(enemy, bot);
      if (d < bestDist) { bestDist = d; nearest = { x: bot.x, y: bot.y, id: bot.id, kind: 'bot' }; }
    }
    if (nearest) return nearest;

    bestDist = SIGHT;

    // 3. Nearest hero in sight
    for (const [, p] of this.state.players) {
      if (p.isDead) continue;
      const d = this.dist(enemy, p);
      if (d < bestDist) { bestDist = d; nearest = { x: p.x, y: p.y, id: p.id, kind: 'hero' }; }
    }
    if (nearest) return nearest;

    return null;
  }

  private moveEnemyTowardBase(enemy: EnemyState, speed: number, id: string) {
    // Use cached path or request new one
    let pathData = this.enemyPaths.get(id);

    if (!pathData || pathData.path.length === 0) {
      const path = this.pathfinder.findPath(
        { x: enemy.x, y: enemy.y },
        { x: BASE_X, y: BASE_Y },
      );
      pathData = { path, step: 0 };
      this.enemyPaths.set(id, pathData);
    }

    if (pathData.path.length > pathData.step) {
      const waypoint = pathData.path[pathData.step];
      const dx = waypoint.x - enemy.x;
      const dy = waypoint.y - enemy.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 8) {
        pathData.step++;
      } else {
        enemy.x += (dx / d) * speed;
        enemy.y += (dy / d) * speed;
      }
    } else {
      // Reached base — attack it
      this.state.baseHP = Math.max(0, this.state.baseHP - 1);
      if (this.state.baseHP <= 0) this.triggerGameOver();
    }
  }

  private applyEnemyAttack(enemy: EnemyState, target: EnemyTarget) {
    const stats  = ENEMY_STATS[enemy.enemyType as EnemyType];
    const damage = stats.damage;

    if (target.kind === 'building' && target.id) {
      const b = this.state.buildings.get(target.id);
      if (b && !b.isDestroyed) {
        b.hp -= damage;
        if (b.hp <= 0) {
          b.hp = 0;
          b.isDestroyed = true;
          // Invalidate enemy paths (building removed)
          this.enemyPaths.clear();
        }
      }
    } else if (target.kind === 'bot' && target.id) {
      const bot = this.state.botUnits.get(target.id);
      if (bot && !bot.isDead) {
        bot.hp -= damage;
        if (bot.hp <= 0) { bot.hp = 0; bot.isDead = true; }
      }
    } else if (target.kind === 'hero' && target.id) {
      const player = this.state.players.get(target.id);
      if (player && !player.isDead) {
        player.hp -= damage;
        if (player.hp <= 0) {
          player.hp    = 0;
          player.isDead  = true;
          player.deaths++;
          player.respawnAt = Date.now() + HERO_RESPAWN_MS;
        }
      }
    } else if (target.kind === 'base') {
      this.state.baseHP = Math.max(0, this.state.baseHP - damage);
      if (this.state.baseHP <= 0) this.triggerGameOver();
    }
  }

  // ─── Buildings Tick ────────────────────────────────────────────────────

  private tickBuildings(dt: number) {
    for (const [id, b] of this.state.buildings) {
      if (b.isDestroyed) continue;

      const levels = BUILDING_STATS[b.buildingType as BuildingType];
      const stats  = levels[b.level - 1];
      if (!stats) continue;

      // Find nearest enemy in range
      let nearestEnemy: EnemyState | null = null;
      let nearestDist = stats.range;

      for (const [, e] of this.state.enemies) {
        if (e.isDead) continue;
        const d = this.dist(b, e);
        if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
      }

      if (!nearestEnemy) continue;

      // Attack timer
      const timer = (this.buildingAttackTimers.get(id) ?? 0) - dt;
      this.buildingAttackTimers.set(id, timer);

      if (timer > 0) continue;

      if (b.buildingType === 'LaserTower') {
        // Continuous damage (DPS × dt/1000)
        const dps     = stats.damage;
        const dmg     = dps * (dt / 1000);
        this.buildingAttackTimers.set(id, 0); // continuous
        this.dealDamageToEnemy(nearestEnemy, dmg);
      } else if (b.buildingType === 'Mortar') {
        // AoE
        this.buildingAttackTimers.set(id, stats.fireRate * 1000);
        const aoe = stats.aoeRadius ?? 80;
        for (const [, e] of this.state.enemies) {
          if (e.isDead) continue;
          if (this.dist(nearestEnemy, e) <= aoe) {
            this.dealDamageToEnemy(e, stats.damage);
          }
        }
      } else {
        // ArrowTower — single target
        this.buildingAttackTimers.set(id, stats.fireRate * 1000);
        this.dealDamageToEnemy(nearestEnemy, stats.damage);
      }
    }
  }

  // ─── Bots Tick ─────────────────────────────────────────────────────────

  private tickBots(dt: number) {
    for (const [id, bot] of this.state.botUnits) {
      if (bot.isDead) continue;

      const stats   = BOT_STATS[bot.botType as BotUnitType];
      const timer   = (this.botAttackTimers.get(id) ?? 0) - dt;
      this.botAttackTimers.set(id, timer);

      if (timer > 0) continue;

      // Find nearest enemy in attack range
      let nearestEnemy: EnemyState | null = null;
      let nearestDist = stats.attackRange;

      for (const [, e] of this.state.enemies) {
        if (e.isDead) continue;
        const d = this.dist(bot, e);
        if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
      }

      if (nearestEnemy) {
        this.botAttackTimers.set(id, stats.attackSpeed * 1000);
        this.dealDamageToEnemy(nearestEnemy, stats.damage);
      }
    }
  }

  // ─── Respawns ──────────────────────────────────────────────────────────

  private tickRespawns() {
    const now = Date.now();
    for (const [, p] of this.state.players) {
      if (p.isDead && p.respawnAt > 0 && now >= p.respawnAt) {
        const stats = HERO_STATS[p.heroType as HeroType];
        p.isDead     = false;
        p.hp         = stats.maxHp;
        p.respawnAt  = 0;
        p.x          = BASE_X;
        p.y          = BASE_Y - 80;
      }
    }
  }

  // ─── Hero Ability ──────────────────────────────────────────────────────

  private applyHeroAbility(player: PlayerState) {
    const heroType = player.heroType as HeroType;

    switch (heroType) {
      case 'Paladin': {
        // HP regen to nearby allies (150px) for 3s — mark with a flag; simple version: instant +20 hp
        for (const [, p] of this.state.players) {
          if (p.isDead) continue;
          if (this.dist(player, p) <= 150) {
            p.hp = Math.min(p.maxHp, p.hp + 20);
          }
        }
        break;
      }
      case 'Büyücü': {
        // AoE damage 100px around caster
        for (const [, e] of this.state.enemies) {
          if (e.isDead) continue;
          if (this.dist(player, e) <= 100) {
            this.dealDamageToEnemy(e, 120, player.sessionId);
          }
        }
        break;
      }
      // Other heroes: Sövalye (shield), Barbar (dmg x2), Ranger (speed), Druid (maxHP)
      // Effect tracking (cooldown enforcement) is handled client-side for now.
      default: break;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private dealDamageToEnemy(enemy: EnemyState, amount: number, killerId?: string) {
    if (enemy.isDead) return;
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      enemy.hp    = 0;
      enemy.isDead = true;

      // Give kill reward
      const reward = GOLD_REWARDS[enemy.enemyType as EnemyType];
      this.state.sharedGold += reward;

      // Credit kill to attacker
      if (killerId) {
        const player = this.state.players.get(killerId);
        if (player) { player.kills++; player.damageDealt += amount; }
      }
    }
  }

  private canPlaceBuilding(x: number, y: number): boolean {
    for (const [, b] of this.state.buildings) {
      if (b.isDestroyed) continue;
      if (this.dist({ x, y }, b) < 48) return false;
    }
    // TODO: Check terrain (water) via MapSystem when integrated
    return true;
  }

  private triggerGameOver() {
    this.state.gameOver = true;
    this.state.phase    = 'gameover';
    this.broadcast('game_over', { wave: this.state.currentWave });
    console.log(`[GameRoom] Game over — wave ${this.state.currentWave}`);
  }

  private dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
