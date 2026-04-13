import { Schema, MapSchema, type, ArraySchema } from '@colyseus/schema';
import type { HeroType, BuildingType, BotUnitType, EnemyType, GamePhase } from '../../../shared/types';

// ─── PlayerState ──────────────────────────────────────────────────────────

export class PlayerState extends Schema {
  @type('string') id:        string = '';
  @type('string') sessionId: string = '';
  @type('string') username:  string = 'Player';
  @type('string') heroType:  string = 'Paladin';

  @type('number') x:     number = 0;
  @type('number') y:     number = 0;
  @type('number') hp:    number = 100;
  @type('number') maxHp: number = 100;

  @type('boolean') isDead:    boolean = false;
  @type('number')  respawnAt: number  = 0; // server timestamp ms

  // session stats
  @type('number') kills:      number = 0;
  @type('number') deaths:     number = 0;
  @type('number') damageDealt:number = 0;
}

// ─── BuildingState ────────────────────────────────────────────────────────

export class BuildingState extends Schema {
  @type('string') id:           string = '';
  @type('string') ownerId:      string = ''; // sessionId of placer
  @type('string') buildingType: string = 'ArcherTower';

  @type('number') x:     number = 0;
  @type('number') y:     number = 0;
  @type('number') hp:    number = 300;
  @type('number') maxHp: number = 300;
  @type('number') level: number = 1;

  @type('boolean') isDestroyed: boolean = false;
}

// ─── BotUnitState ─────────────────────────────────────────────────────────

export class BotUnitState extends Schema {
  @type('string') id:      string = '';
  @type('string') ownerId: string = '';
  @type('string') botType: string = 'Warrior';

  @type('number') x:     number = 0;
  @type('number') y:     number = 0;
  @type('number') hp:    number = 180;
  @type('number') maxHp: number = 180;

  @type('boolean') isDead: boolean = false;
}

// ─── EnemyState ───────────────────────────────────────────────────────────

export class EnemyState extends Schema {
  @type('string') id:        string = '';
  @type('string') enemyType: string = 'Warrior';

  @type('number') x:     number = 0;
  @type('number') y:     number = 0;
  @type('number') hp:    number = 100;
  @type('number') maxHp: number = 100;

  @type('boolean') isDead: boolean = false;
}

// ─── GameState ────────────────────────────────────────────────────────────

export class GameState extends Schema {
  @type({ map: PlayerState })   players:   MapSchema<PlayerState>   = new MapSchema<PlayerState>();
  @type({ map: BuildingState }) buildings: MapSchema<BuildingState> = new MapSchema<BuildingState>();
  @type({ map: BotUnitState })  botUnits:  MapSchema<BotUnitState>  = new MapSchema<BotUnitState>();
  @type({ map: EnemyState })    enemies:   MapSchema<EnemyState>    = new MapSchema<EnemyState>();

  @type('number')  sharedGold:  number = 200;
  @type('number')  currentWave: number = 1;
  @type('number')  baseHP:      number = 5000;
  @type('string')  phase:       string = 'prep';   // GamePhase
  @type('number')  prepTimer:   number = 30000;    // ms remaining
  @type('boolean') gameOver:    boolean = false;
}
