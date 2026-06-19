import { Weapon, Tool, Tank, Arena, TankType } from './types';

export const WEAPON_DEFS: Weapon[] = [
  {
    id: 'laser',
    name: 'Pulse Laser',
    type: 'laser',
    damage: 10,
    speed: 7,
    fuelCost: 2,
    fireRate: 250,
    unlocked: true,
    color: '#00ffff',
    description: 'Rapid-fire basic energy bolt. Low damage, low fuel consumption.'
  },
  {
    id: 'plasma',
    name: 'Heavy Plasma',
    type: 'plasma',
    damage: 30,
    speed: 4.5,
    fuelCost: 10,
    fireRate: 800,
    unlocked: false,
    color: '#ff3366',
    description: 'Slow-moving concentrate of high-energy plasma. Heavy damage.'
  },
  {
    id: 'spread',
    name: 'Spread Shot',
    type: 'spread',
    damage: 12, // per projectile
    speed: 6.5,
    fuelCost: 6,
    fireRate: 500,
    unlocked: false,
    color: '#ffff00',
    description: 'Fires three energy bolts in a spreading arc. Great for close range.'
  },
  {
    id: 'seeker',
    name: 'Seeker Missile',
    type: 'seeker',
    damage: 25,
    speed: 3.5,
    fuelCost: 15,
    fireRate: 1000,
    unlocked: false,
    color: '#ff9900',
    description: 'Slow, smart rocket that tracks the nearest opponent.'
  },
  {
    id: 'bounce',
    name: 'Bouncing Disc',
    type: 'bounce',
    damage: 15,
    speed: 6.0,
    fuelCost: 5,
    fireRate: 400,
    unlocked: false,
    color: '#33ff33',
    description: 'Fires a kinetic disc that bounces off walls up to 4 times.'
  },
  {
    id: 'mine',
    name: 'Proximity Mine',
    type: 'mine',
    damage: 35,
    speed: 0,
    fuelCost: 12,
    fireRate: 1200,
    unlocked: false,
    color: '#cc33ff',
    description: 'Deploys a stationary cloaked explosive. Detonates when touched.'
  }
];

export const TOOL_DEFS: Tool[] = [
  {
    id: 'shield',
    name: 'Energy Shield',
    type: 'shield',
    fuelCost: 20,
    cooldown: 5000,
    lastUsed: 0,
    unlocked: false,
    description: 'Creates a temporary forcefield rendering your tank immune to damage for 2.5 seconds.'
  },
  {
    id: 'teleport',
    name: 'Phase Blink',
    type: 'teleport',
    fuelCost: 15,
    cooldown: 3000,
    lastUsed: 0,
    unlocked: false,
    description: 'Instantly teleports your tank forward a short distance.'
  }
];

export interface TankConfig {
  type: TankType;
  name: string;
  speed: number;
  rotationSpeed: number; // rad/frame
  maxHealth: number;
  maxFuel: number;
  cost: number;
  description: string;
}

export const TANK_DEFS: Record<TankType, TankConfig> = {
  scout: {
    type: 'scout',
    name: 'Vanguard Scout',
    speed: 3.5,
    rotationSpeed: 0.08,
    maxHealth: 80,
    maxFuel: 80,
    cost: 100,
    description: 'Lightweight, extremely fast and agile, but fragile armor.'
  },
  assault: {
    type: 'assault',
    name: 'Interceptor M1',
    speed: 2.7,
    rotationSpeed: 0.06,
    maxHealth: 120,
    maxFuel: 120,
    cost: 120,
    description: 'Standard multi-role tank. Good speed, solid armor, and reliable fuel capacity.'
  },
  dreadnought: {
    type: 'dreadnought',
    name: 'Titan Dreadnought',
    speed: 1.8,
    rotationSpeed: 0.04,
    maxHealth: 180,
    maxFuel: 180,
    cost: 160,
    description: 'Slow-moving fortress. Massive armor capacity and large fuel tanks to outlast foes.'
  }
};

export const UPGRADE_PRICES = {
  discountMembership: 150,
  tankSpeed: 80,
  tankRotation: 60,
  tankArmor: 100,
  refillFuel: 20,
  refillHealth: 30
};

export const ARENAS: Arena[] = [
  {
    id: 'zone-alpha',
    name: 'Zone Alpha (Core Station)',
    width: 900,
    height: 600,
    obstacles: [
      // Central cross
      { x: 410, y: 150, width: 80, height: 120 },
      { x: 410, y: 330, width: 80, height: 120 },
      { x: 200, y: 270, width: 150, height: 60 },
      { x: 550, y: 270, width: 150, height: 60 },
      // Side blocks
      { x: 100, y: 80, width: 60, height: 100 },
      { x: 740, y: 80, width: 60, height: 100 },
      { x: 100, y: 420, width: 60, height: 100 },
      { x: 740, y: 420, width: 60, height: 100 }
    ],
    chargingZones: [
      { x: 40, y: 40, radius: 30, intensity: 1 },
      { x: 860, y: 40, radius: 30, intensity: 1 },
      { x: 40, y: 560, radius: 30, intensity: 1 },
      { x: 860, y: 560, radius: 30, intensity: 1 }
    ]
  },
  {
    id: 'void-chamber',
    name: 'Void Chamber (Open Combat)',
    width: 900,
    height: 600,
    obstacles: [
      // Outer ring of small columns
      { x: 200, y: 150, width: 50, height: 50 },
      { x: 650, y: 150, width: 50, height: 50 },
      { x: 200, y: 400, width: 50, height: 50 },
      { x: 650, y: 400, width: 50, height: 50 },
      // Central diamond blocks
      { x: 425, y: 275, width: 50, height: 50 }
    ],
    chargingZones: [
      { x: 40, y: 40, radius: 30, intensity: 1 },
      { x: 860, y: 40, radius: 30, intensity: 1 },
      { x: 40, y: 560, radius: 30, intensity: 1 },
      { x: 860, y: 560, radius: 30, intensity: 1 }
    ]
  },
  {
    id: 'labyrinth',
    name: 'The Grid Labyrinth',
    width: 900,
    height: 600,
    obstacles: [
      // Horizontal barriers
      { x: 0, y: 180, width: 250, height: 20 },
      { x: 650, y: 180, width: 250, height: 20 },
      { x: 250, y: 400, width: 400, height: 20 },
      // Vertical dividers
      { x: 440, y: 50, width: 20, height: 180 },
      { x: 200, y: 200, width: 20, height: 200 },
      { x: 680, y: 200, width: 20, height: 200 }
    ],
    chargingZones: [
      { x: 40, y: 40, radius: 30, intensity: 1 },
      { x: 860, y: 40, radius: 30, intensity: 1 },
      { x: 40, y: 560, radius: 30, intensity: 1 },
      { x: 860, y: 560, radius: 30, intensity: 1 }
    ]
  }
];

export function createDefaultTank(
  id: string,
  name: string,
  type: TankType,
  color: string,
  isRobot = false,
  robotBehavior?: Tank['robotBehavior']
): Tank {
  const config = TANK_DEFS[type];
  return {
    id,
    name,
    type,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    fuel: config.maxFuel,
    maxFuel: config.maxFuel,
    color,
    isRobot,
    robotBehavior,
    score: 0,
    money: 0,
    isDead: false,
    activeWeaponIndex: 0,
    weapons: JSON.parse(JSON.stringify(WEAPON_DEFS)), // Clone defaults
    tools: JSON.parse(JSON.stringify(TOOL_DEFS)),
    upgrades: { speed: 0, rotation: 0, armor: 0 },
    hasDiscount: false,
    shieldActive: false,
    shieldDuration: 2500,
    lastFired: 0
  };
}
