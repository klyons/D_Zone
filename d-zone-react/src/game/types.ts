export type TankType = 'scout' | 'assault' | 'dreadnought';

export interface Weapon {
  id: string;
  name: string;
  type: 'laser' | 'plasma' | 'spread' | 'seeker' | 'bounce' | 'mine';
  damage: number;
  speed: number;
  fuelCost: number;
  fireRate: number; // ms between shots
  unlocked: boolean;
  color: string;
  description: string;
}

export interface Tool {
  id: string;
  name: string;
  type: 'shield' | 'teleport';
  fuelCost: number;
  cooldown: number; // ms
  lastUsed: number;
  unlocked: boolean;
  description: string;
}

export interface TankUpgrades {
  speed: number; // 0, 1, 2...
  rotation: number;
  armor: number;
}

export interface Tank {
  id: string;
  name: string;
  type: TankType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // in radians
  health: number;
  maxHealth: number;
  fuel: number; // 0 to 100
  maxFuel: number;
  color: string;
  isRobot: boolean;
  robotBehavior?: 'aggressive' | 'cautious' | 'ambusher' | 'sniper';
  score: number;
  money: number;
  isDead: boolean;
  activeWeaponIndex: number;
  weapons: Weapon[];
  tools: Tool[];
  upgrades: TankUpgrades;
  hasDiscount: boolean;
  shieldActive: boolean;
  shieldDuration: number; // ms
  lastFired: number; // timestamp
  team?: 'alpha' | 'omega';
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  type: Weapon['type'];
  radius: number;
  angle?: number; // for rendering certain shapes
  bounces?: number;
  maxBounces?: number;
  lifetime?: number; // in ms
  createdAt: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChargingZone {
  x: number;
  y: number;
  radius: number;
  intensity: number; // for visual pulse
}

export interface ArenaFeature {
  type: 'hazard' | 'speedBoost' | 'gravityWell' | 'teleportPad';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  damage?: number;
  multiplier?: number;
  strength?: number;
  targetX?: number;
  targetY?: number;
  targetId?: string;
}

export interface Arena {
  id: string;
  name: string;
  width: number;
  height: number;
  obstacles: RectObstacle[];
  chargingZones: ChargingZone[];
  features?: ArenaFeature[];
}

export interface GameSettings {
  humanPlayers: number;
  robotCount: number;
  roundLimit: number;
  timeLimit: number; // in seconds
  soundEnabled: boolean;
  arenaId: string;
  teamMode: boolean;
}
