import { WebSocketServer, WebSocket } from 'ws';
import { Tank, GameSettings } from '../../src/game/types.ts';
import { ARENAS, createDefaultTank } from '../../src/game/constants.ts';
import { arrangeTanksAtSpawns } from '../../src/game/engine.ts';
import { createServerState, tickServer, getStateSnapshot, getAndClearEvents, type PlayerConnection } from './gameLoop.ts';
import type { ClientMessage, ServerMessage } from './messages.ts';

const PORT = parseInt(process.env.PORT || '3001', 10);
const TICK_MS = 50; // 20 Hz

const DEFAULT_SETTINGS: GameSettings = {
  humanPlayers: 2,
  robotCount: 3,
  roundLimit: 3,
  timeLimit: 90,
  soundEnabled: true,
  arenaId: 'zone-alpha',
  teamMode: false,
};

const state = createServerState(DEFAULT_SETTINGS);
const clients = new Map<WebSocket, PlayerConnection>();
let nextPlayerId = 0;

const ALL_BEHAVIORS: Tank['robotBehavior'][] = ['aggressive', 'cautious', 'ambusher', 'sniper'];
const ROBOT_NAMES = ['AGGRESSOR', 'GUARDIAN', 'PHANTOM', 'HUNTER', 'DEFENDER', 'RAVEN', 'VIPER', 'FANG', 'SPECTRE'];
const ROBOT_COLORS = ['#ff6600', '#33ff33', '#ffff33', '#cc33ff', '#ff3333', '#ff9933', '#66ff66', '#ff66ff', '#ffcc00'];
const ROBOT_HULLS: Array<'scout' | 'assault' | 'dreadnought'> = ['assault', 'scout', 'dreadnought', 'assault', 'dreadnought', 'scout', 'assault', 'dreadnought', 'scout'];

function broadcast(msg: ServerMessage) {
  const data = JSON.stringify(msg);
  for (const ws of clients.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function startGame() {
  state.roundNum = 0;
  state.bullets = [];
  state.events = [];
  state.sequence = 0;

  const arena = ARENAS.find(a => a.id === state.settings.arenaId) || ARENAS[0];

  // Build tanks from connected clients
  const tankList = [];
  const playerIds: string[] = [];

  for (const [, pc] of clients) {
    playerIds.push(pc.id);
    const t = createDefaultTank(pc.id, pc.name, 'assault', '#00ffff', false);
    tankList.push(t);
    pc.keys = {};
    pc.cycleWeapon = false;
    pc.useTool = false;
  }

  state.settings.humanPlayers = Math.min(clients.size, 2);

  // AI bots
  for (let i = 0; i < state.settings.robotCount; i++) {
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

  // Assign teams
  if (state.settings.teamMode) {
    tankList.forEach((t, i) => {
      if (t.id === playerIds[0]) t.team = 'alpha';
      else if (t.id === playerIds[1]) t.team = 'omega';
      else t.team = i % 2 === 0 ? 'alpha' : 'omega';
    });
  }

  state.tanks = tankList;
  arrangeTanksAtSpawns(state.tanks, arena);
  state.timeLeft = state.settings.timeLimit;
  state.roundNum = 1;
  state.phase = 'playing';

  // Welcome each client
  for (const [ws, pc] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'welcome',
        playerId: pc.id,
        arena,
        settings: {
          roundLimit: state.settings.roundLimit,
          timeLimit: state.settings.timeLimit,
          teamMode: state.settings.teamMode,
        },
      } satisfies ServerMessage));
    }
  }
}

function broadcastState() {
  if (state.phase === 'game_over') return;

  const snapshot = getStateSnapshot(state);
  broadcast({ type: 'state', ...snapshot });

  const events = getAndClearEvents(state);
  if (events.length > 0) {
    broadcast({ type: 'events', events });
  }

  if (state.phase === 'round_over') {
    const winner = state.tanks.find(t => !t.isDead);
    const winnerTeam = state.settings.teamMode
      ? (state.tanks.find(t => t.team === 'alpha' && !t.isDead) ? 'alpha' :
         state.tanks.find(t => t.team === 'omega' && !t.isDead) ? 'omega' : undefined)
      : undefined;
    broadcast({
      type: 'round_end',
      winnerId: winner?.id || null,
      winnerTeam,
      scores: state.tanks.map(t => ({
        id: t.id, name: t.name, score: t.score, money: t.money, isDead: t.isDead,
      })),
      nextRoundIn: Math.ceil(state.roundEndTimer / 1000),
    });
  }
}

// ── Game Loop ──
let lastTick = performance.now();
function gameLoop(now: number) {
  const delta = now - lastTick;
  lastTick = now;

  if (state.phase === 'playing' || state.phase === 'round_over') {
    // Process single-fire actions from clients
    for (const [, pc] of clients) {
      const tank = state.tanks.find(t => t.id === pc.id);
      if (!tank || tank.isDead) continue;
      if (pc.cycleWeapon) {
        let idx = tank.activeWeaponIndex;
        const start = idx;
        do { idx = (idx + 1) % tank.weapons.length; }
        while (!tank.weapons[idx].unlocked && idx !== start);
        tank.activeWeaponIndex = idx;
        pc.cycleWeapon = false;
      }
      if (pc.useTool) {
        pc.useTool = false;
      }
    }

    tickServer(state, Math.min(delta, TICK_MS * 2));
    broadcastState();

    if ((state.phase as string) === 'game_over') {
      broadcast({
        type: 'game_over',
        championId: state.tanks.reduce((best, t) => t.score > best.score ? t : best, state.tanks[0]).id,
        finalScores: state.tanks.map(t => ({
          id: t.id, name: t.name, score: t.score, money: t.money, team: t.team,
        })),
      });
    }
  }

  setTimeout(() => gameLoop(performance.now()), TICK_MS);
}

// ── WebSocket Server ──

const wss = new WebSocketServer({ port: PORT });
console.log(`D-Zone server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const playerId = `p${nextPlayerId++}`;
  const pc: PlayerConnection = { id: playerId, name: `Player ${nextPlayerId}`, keys: {}, cycleWeapon: false, useTool: false };
  clients.set(ws, pc);

  console.log(`Client connected: ${playerId} (${clients.size} total)`);

  ws.on('message', (raw) => {
    try {
      const msg: ClientMessage = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'join':
          pc.name = msg.name;
          console.log(`  → ${playerId} is now "${msg.name}"`);
          // Start game once we have at least one player
          if (state.phase === 'lobby') {
            startGame();
          }
          break;
        case 'input':
          pc.keys = msg.keys;
          break;
        case 'cycle_weapon':
          pc.cycleWeapon = true;
          break;
        case 'use_tool':
          pc.useTool = true;
          break;
      }
    } catch (e) {
      console.error('Invalid message:', raw.toString());
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected: ${playerId} (${clients.size} remaining)`);
  });

  // Send ack
  ws.send(JSON.stringify({
    type: 'welcome',
    playerId,
    arena: ARENAS.find(a => a.id === state.settings.arenaId) || ARENAS[0],
    settings: {
      roundLimit: state.settings.roundLimit,
      timeLimit: state.settings.timeLimit,
      teamMode: state.settings.teamMode,
    },
  } satisfies ServerMessage));
});

// Start game loop
setTimeout(() => gameLoop(performance.now()), TICK_MS);
