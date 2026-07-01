import type { Arena } from '../../src/game/types.ts';

// ── Snapshot types (lightweight copies for wire transfer) ──

export interface TankSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  fuel: number;
  maxFuel: number;
  color: string;
  team?: 'alpha' | 'omega';
  isDead: boolean;
  isRobot: boolean;
  shieldActive: boolean;
  activeWeaponIndex: number;
  score: number;
  money: number;
}

export interface BulletSnapshot {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string;
  color: string;
  radius: number;
  bounces?: number;
  maxBounces?: number;
}

// ── Game event (one-shot effects the client should play) ──

export interface GameEvent {
  kind: 'explosion' | 'hit' | 'charge' | 'shield' | 'teleport';
  x: number;
  y: number;
  color: string;
  ownerId?: string;
}

// ── Client → Server messages ──

export interface JoinMessage {
  type: 'join';
  name: string;
}

export interface InputMessage {
  type: 'input';
  keys: Record<string, boolean>;
}

export interface CycleWeaponMessage {
  type: 'cycle_weapon';
}

export interface UseToolMessage {
  type: 'use_tool';
}

export type ClientMessage = JoinMessage | InputMessage | CycleWeaponMessage | UseToolMessage;

// ── Server → Client messages ──

export interface WelcomeMessage {
  type: 'welcome';
  playerId: string;
  arena: Arena;
  settings: {
    roundLimit: number;
    timeLimit: number;
    teamMode: boolean;
  };
}

export interface StateMessage {
  type: 'state';
  sequence: number;
  tanks: TankSnapshot[];
  bullets: BulletSnapshot[];
  roundNum: number;
  timeLeft: number;
  gameState: 'waiting' | 'playing' | 'round_over' | 'game_over';
}

export interface EventsMessage {
  type: 'events';
  events: GameEvent[];
}

export interface RoundEndMessage {
  type: 'round_end';
  winnerId: string | null;
  winnerTeam?: 'alpha' | 'omega';
  scores: Array<{ id: string; name: string; score: number; money: number; isDead: boolean }>;
  nextRoundIn: number;
}

export interface GameOverMessage {
  type: 'game_over';
  championId: string;
  finalScores: Array<{ id: string; name: string; score: number; money: number; team?: 'alpha' | 'omega' }>;
}

export type ServerMessage = WelcomeMessage | StateMessage | EventsMessage | RoundEndMessage | GameOverMessage;
