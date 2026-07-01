import { Tank, Bullet, GameSettings } from '../../src/game/types.ts';
import { ARENAS, createDefaultTank } from '../../src/game/constants.ts';
import { updateGameFrame, arrangeTanksAtSpawns } from '../../src/game/engine.ts';
import type { TankSnapshot, BulletSnapshot, GameEvent } from './messages.ts';

export interface PlayerConnection {
  id: string;
  name: string;
  keys: Record<string, boolean>;
  cycleWeapon: boolean;
  useTool: boolean;
}

export type GamePhase = 'lobby' | 'playing' | 'round_over' | 'game_over';

export interface ServerState {
  phase: GamePhase;
  tanks: Tank[];
  bullets: Bullet[];
  settings: GameSettings;
  roundNum: number;
  timeLeft: number;
  players: PlayerConnection[];
  sequence: number;
  events: GameEvent[];
  roundEndTimer: number;
}

export function createServerState(settings: GameSettings): ServerState {
  return {
    phase: 'lobby',
    tanks: [],
    bullets: [],
    settings,
    roundNum: 0,
    timeLeft: settings.timeLimit,
    players: [],
    sequence: 0,
    events: [],
    roundEndTimer: 0,
  };
}

const ALL_BEHAVIORS: Tank['robotBehavior'][] = ['aggressive', 'cautious', 'ambusher', 'sniper'];
const ROBOT_NAMES = ['AGGRESSOR', 'GUARDIAN', 'PHANTOM', 'HUNTER', 'DEFENDER', 'RAVEN', 'VIPER', 'FANG', 'SPECTRE'];
const ROBOT_COLORS = ['#ff6600', '#33ff33', '#ffff33', '#cc33ff', '#ff3333', '#ff9933', '#66ff66', '#ff66ff', '#ffcc00'];
const ROBOT_HULLS: Array<'scout' | 'assault' | 'dreadnought'> = ['assault', 'scout', 'dreadnought', 'assault', 'dreadnought', 'scout', 'assault', 'dreadnought', 'scout'];

function startRound(state: ServerState) {
  const { settings } = state;
  state.roundNum++;
  state.bullets = [];
  state.events = [];
  state.sequence = 0;

  const arena = ARENAS.find(a => a.id === settings.arenaId) || ARENAS[0];

  // Build tank list from connected players + bots
  const tankList: Tank[] = [];
  for (const p of state.players) {
    const t = createDefaultTank(p.id, p.name, 'assault', '#00ffff', false);
    tankList.push(t);
    p.keys = {};
    p.cycleWeapon = false;
    p.useTool = false;
  }

  // Fill remaining slots with AI
  const aiCount = settings.robotCount;
  for (let i = 0; i < aiCount; i++) {
    const t = createDefaultTank(
      `bot_${i}`,
      ROBOT_NAMES[i % ROBOT_NAMES.length],
      ROBOT_HULLS[i % ROBOT_HULLS.length],
      ROBOT_COLORS[i % ROBOT_COLORS.length],
      true,
      ALL_BEHAVIORS[Math.floor(Math.random() * ALL_BEHAVIORS.length)]
    );
    tankList.push(t);
  }

  // Assign teams in team mode
  if (settings.teamMode) {
    tankList.forEach((t, i) => {
      if (t.id === state.players[0]?.id) t.team = 'alpha';
      else if (t.id === state.players[1]?.id) t.team = 'omega';
      else t.team = i % 2 === 0 ? 'alpha' : 'omega';
    });
  }

  state.tanks = tankList;
  arrangeTanksAtSpawns(state.tanks, arena);
  state.timeLeft = settings.timeLimit;
  state.phase = 'playing';
}

function buildTankSnapshot(t: Tank): TankSnapshot {
  return {
    id: t.id,
    name: t.name,
    x: t.x,
    y: t.y,
    angle: t.angle,
    health: t.health,
    maxHealth: t.maxHealth,
    fuel: t.fuel,
    maxFuel: t.maxFuel,
    color: t.color,
    team: t.team,
    isDead: t.isDead,
    isRobot: t.isRobot,
    shieldActive: t.shieldActive,
    activeWeaponIndex: t.activeWeaponIndex,
    score: t.score,
    money: t.money,
  };
}

function buildBulletSnapshot(b: Bullet): BulletSnapshot {
  return {
    id: b.id,
    ownerId: b.ownerId,
    x: b.x,
    y: b.y,
    vx: b.vx,
    vy: b.vy,
    type: b.type,
    color: b.color,
    radius: b.radius,
    bounces: b.bounces,
    maxBounces: b.maxBounces,
  };
}

export function tickServer(state: ServerState, deltaMs: number): ServerState {
  if (state.phase === 'round_over') {
    state.roundEndTimer -= deltaMs;
    if (state.roundEndTimer <= 0) {
      if (state.roundNum >= state.settings.roundLimit) {
        state.phase = 'game_over';
      } else {
        startRound(state);
      }
    }
    state.sequence++;
    return state;
  }

  if (state.phase !== 'playing') {
    state.sequence++;
    return state;
  }

  // Build keys map from all players
  const keys: Record<string, boolean> = {};
  for (const p of state.players) {
    for (const k of Object.keys(p.keys)) {
      keys[k] = p.keys[k];
    }
    // Handle single-fire actions
    if (p.cycleWeapon) {
      p.cycleWeapon = false;
      // We'll need to handle this outside updateGameFrame
    }
    if (p.useTool) {
      p.useTool = false;
    }
  }

  const arena = ARENAS.find(a => a.id === state.settings.arenaId) || ARENAS[0];
  const timestamp = Date.now();

  // Handle weapon cycling and tool usage (updateGameFrame doesn't handle these well)
  for (const p of state.players) {
    const tank = state.tanks.find(t => t.id === p.id);
    if (!tank || tank.isDead) continue;
    if (p.cycleWeapon) {
      let idx = tank.activeWeaponIndex;
      const start = idx;
      do { idx = (idx + 1) % tank.weapons.length; }
      while (!tank.weapons[idx].unlocked && idx !== start);
      tank.activeWeaponIndex = idx;
      p.cycleWeapon = false;
    }
  }

  const result = updateGameFrame(
    state.tanks,
    state.bullets,
    arena,
    keys,
    state.settings,
    timestamp
  );

  state.tanks = result.tanks;
  state.bullets = result.bullets;

  // Collect particle spawns as events
  for (const p of result.particleSpawns) {
    const eventKind = p.speed > 3 ? 'explosion' : p.speed > 2 ? 'hit' : 'charge';
    state.events.push({ kind: eventKind as GameEvent['kind'], x: p.x, y: p.y, color: p.color });
  }

  // Time management
  state.timeLeft -= deltaMs / 1000;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endRound(state, null);
    return state;
  }

  // Win condition
  const alive = state.tanks.filter(t => !t.isDead);
  if (alive.length === 0) {
    endRound(state, null);
    return state;
  }

  if (state.settings.teamMode) {
    const alphaAlive = state.tanks.filter(t => t.team === 'alpha' && !t.isDead);
    const omegaAlive = state.tanks.filter(t => t.team === 'omega' && !t.isDead);
    if (alphaAlive.length === 0) {
      endRound(state, omegaAlive[0]?.id || null, 'omega');
      return state;
    }
    if (omegaAlive.length === 0) {
      endRound(state, alphaAlive[0]?.id || null, 'alpha');
      return state;
    }
  } else if (alive.length === 1) {
    endRound(state, alive[0].id);
    return state;
  }

  state.sequence++;
  return state;
}

function endRound(state: ServerState, winnerId: string | null, winnerTeam?: 'alpha' | 'omega') {
  state.phase = 'round_over';
  state.roundEndTimer = 8000; // Show results for 8 seconds

  // Award credits
  const winner = state.tanks.find(t => t.id === winnerId);
  if (winner) {
    if (state.settings.teamMode && winnerTeam) {
      state.tanks.forEach(t => {
        if (t.team === winnerTeam && !t.isDead) {
          t.score += 150;
          t.money += 80;
        }
      });
    } else {
      winner.score += 200;
      winner.money += 120;
    }
  }
  state.tanks.forEach(t => {
    t.money += t.isDead ? 20 : 50;
  });
}

export function getStateSnapshot(state: ServerState) {
  return {
    sequence: state.sequence,
    tanks: state.tanks.map(buildTankSnapshot),
    bullets: state.bullets.map(buildBulletSnapshot),
    roundNum: state.roundNum,
    timeLeft: Math.ceil(state.timeLeft),
    gameState: state.phase as 'waiting' | 'playing' | 'round_over' | 'game_over',
  };
}

export function getAndClearEvents(state: ServerState) {
  const events = state.events;
  state.events = [];
  return events;
}
