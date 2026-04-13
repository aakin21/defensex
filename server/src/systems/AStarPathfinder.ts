import { MAP_TILE_SIZE, MAP_COLS, MAP_ROWS, TERRAIN_SPEED } from '../../../shared/types';
import type { TerrainType } from '../../../shared/types';

interface Node {
  col:    number;
  row:    number;
  g:      number; // cost from start
  h:      number; // heuristic to end
  f:      number;
  parent: Node | null;
}

type Grid = TerrainType[][];

// ─── AStarPathfinder ──────────────────────────────────────────────────────
// Converts world-px coordinates to tile grid, runs A*, returns waypoints in px.

export class AStarPathfinder {
  // terrain grid — filled lazily; in practice injected from MapSystem
  private grid: Grid = [];

  setGrid(grid: Grid) {
    this.grid = grid;
  }

  findPath(
    from: { x: number; y: number },
    to:   { x: number; y: number },
  ): { x: number; y: number }[] {
    const startCol = Math.floor(from.x / MAP_TILE_SIZE);
    const startRow = Math.floor(from.y / MAP_TILE_SIZE);
    const endCol   = Math.floor(to.x / MAP_TILE_SIZE);
    const endRow   = Math.floor(to.y / MAP_TILE_SIZE);

    // Clamp to map bounds
    const sc = Math.max(0, Math.min(MAP_COLS - 1, startCol));
    const sr = Math.max(0, Math.min(MAP_ROWS - 1, startRow));
    const ec = Math.max(0, Math.min(MAP_COLS - 1, endCol));
    const er = Math.max(0, Math.min(MAP_ROWS - 1, endRow));

    if (sc === ec && sr === er) return []; // already at destination tile

    const open:   Node[] = [];
    const closed: Set<string> = new Set();

    const key   = (c: number, r: number) => `${c},${r}`;
    const heur  = (c: number, r: number) => Math.abs(c - ec) + Math.abs(r - er);
    const start: Node = { col: sc, row: sr, g: 0, h: heur(sc, sr), f: heur(sc, sr), parent: null };
    open.push(start);

    const DIRS = [
      [0, -1], [0, 1], [-1, 0], [1, 0],   // cardinal
      [-1, -1], [1, -1], [-1, 1], [1, 1],  // diagonal
    ];

    while (open.length > 0) {
      // Pop lowest f
      let idx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[idx].f) idx = i;
      }
      const current = open.splice(idx, 1)[0];

      if (current.col === ec && current.row === er) {
        return this.reconstructPath(current);
      }

      closed.add(key(current.col, current.row));

      for (const [dc, dr] of DIRS) {
        const nc = current.col + dc;
        const nr = current.row + dr;

        if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) continue;
        if (closed.has(key(nc, nr))) continue;

        const terrain = this.getTerrain(nc, nr);
        if (terrain === 'water') continue; // impassable

        const moveCost = (dc !== 0 && dr !== 0) ? 1.414 : 1.0;
        const speedMod = TERRAIN_SPEED[terrain];
        // Higher cost for slow terrain (enemies try to avoid)
        const tileCost = moveCost * (1 / Math.max(speedMod, 0.1));

        const g = current.g + tileCost;
        const h = heur(nc, nr);

        const existing = open.find(n => n.col === nc && n.row === nr);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + existing.h;
            existing.parent = current;
          }
        } else {
          open.push({ col: nc, row: nr, g, h, f: g + h, parent: current });
        }
      }
    }

    // No path found — return straight line fallback
    return [{ x: to.x, y: to.y }];
  }

  private reconstructPath(node: Node): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let current: Node | null = node;
    while (current) {
      path.unshift({
        x: (current.col + 0.5) * MAP_TILE_SIZE,
        y: (current.row + 0.5) * MAP_TILE_SIZE,
      });
      current = current.parent;
    }
    path.shift(); // remove start tile
    return path;
  }

  private getTerrain(col: number, row: number): TerrainType {
    if (this.grid.length > 0 && this.grid[row] && this.grid[row][col]) {
      return this.grid[row][col];
    }
    return 'grass'; // default if no grid loaded
  }
}
