import { Weapon, Tool, Tank, Arena, TankType, RobotPilot } from './types';


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
    width: 1600,
    height: 1000,
    obstacles: [
      // Large control tower (off-center left)
      { x: 350, y: 250, width: 120, height: 200 },
      { x: 350, y: 520, width: 120, height: 30 },
      // Long barrier top-right
      { x: 900, y: 80, width: 250, height: 40 },
      // Storage crates scattered
      { x: 700, y: 250, width: 60, height: 80 },
      { x: 1100, y: 350, width: 70, height: 70 },
      { x: 200, y: 700, width: 100, height: 50 },
      { x: 1300, y: 650, width: 80, height: 120 },
      // Diagonal cover pieces
      { x: 50, y: 400, width: 80, height: 30 },
      { x: 1400, y: 200, width: 40, height: 160 },
      { x: 850, y: 700, width: 50, height: 50 },
      { x: 500, y: 150, width: 40, height: 40 },
    ],
    chargingZones: [
      { x: 80, y: 80, radius: 35, intensity: 1 },
      { x: 1500, y: 60, radius: 35, intensity: 1 },
      { x: 80, y: 920, radius: 35, intensity: 1 },
      { x: 1480, y: 920, radius: 35, intensity: 1 },
    ]
  },
  {
    id: 'void-chamber',
    name: 'Void Chamber (Open Combat)',
    width: 1600,
    height: 1000,
    obstacles: [
      // Large central structure (off-center)
      { x: 700, y: 380, width: 90, height: 90 },
      { x: 650, y: 500, width: 50, height: 120 },
      // Broken pillars scattered
      { x: 200, y: 120, width: 50, height: 50 },
      { x: 1300, y: 100, width: 60, height: 60 },
      { x: 150, y: 750, width: 55, height: 55 },
      { x: 1350, y: 750, width: 45, height: 45 },
      // Rubble walls
      { x: 400, y: 600, width: 30, height: 200 },
      { x: 1100, y: 150, width: 30, height: 180 },
      // Small debris
      { x: 900, y: 250, width: 40, height: 40 },
      { x: 500, y: 350, width: 35, height: 35 },
      { x: 1000, y: 800, width: 60, height: 30 },
    ],
    chargingZones: [
      { x: 60, y: 60, radius: 35, intensity: 1 },
      { x: 1540, y: 60, radius: 35, intensity: 1 },
      { x: 60, y: 940, radius: 35, intensity: 1 },
      { x: 1540, y: 940, radius: 35, intensity: 1 },
    ]
  },
  {
    id: 'labyrinth',
    name: 'The Grid Labyrinth',
    width: 1600,
    height: 1000,
    obstacles: [
      // Asymmetrical maze walls - horizontal
      { x: 0, y: 180, width: 400, height: 25 },
      { x: 550, y: 180, width: 500, height: 25 },
      { x: 1200, y: 180, width: 400, height: 25 },
      { x: 200, y: 420, width: 350, height: 25 },
      { x: 800, y: 420, width: 300, height: 25 },
      { x: 1250, y: 420, width: 200, height: 25 },
      { x: 0, y: 700, width: 600, height: 25 },
      { x: 900, y: 700, width: 700, height: 25 },
      // Vertical walls
      { x: 400, y: 0, width: 25, height: 180 },
      { x: 1050, y: 0, width: 25, height: 180 },
      { x: 400, y: 205, width: 25, height: 215 },
      { x: 800, y: 205, width: 25, height: 215 },
      { x: 1300, y: 205, width: 25, height: 215 },
      { x: 600, y: 445, width: 25, height: 255 },
      { x: 1000, y: 445, width: 25, height: 255 },
      { x: 200, y: 725, width: 25, height: 275 },
      { x: 900, y: 725, width: 25, height: 275 },
    ],
    chargingZones: [
      { x: 80, y: 80, radius: 35, intensity: 1 },
      { x: 1520, y: 80, radius: 35, intensity: 1 },
      { x: 80, y: 920, radius: 35, intensity: 1 },
      { x: 1520, y: 920, radius: 35, intensity: 1 },
    ]
  },
  {
    id: 'inferno-depths',
    name: 'Inferno Depths (Lava Pits)',
    width: 1600,
    height: 1000,
    obstacles: [
      // Collapsed bridge (asymmetrical)
      { x: 500, y: 380, width: 150, height: 30 },
      { x: 800, y: 500, width: 200, height: 30 },
      { x: 400, y: 600, width: 120, height: 30 },
      // Stone pillars and wreckage
      { x: 100, y: 120, width: 60, height: 60 },
      { x: 1400, y: 80, width: 80, height: 80 },
      { x: 1300, y: 750, width: 60, height: 60 },
      { x: 250, y: 820, width: 70, height: 50 },
      // Raised platforms
      { x: 700, y: 180, width: 100, height: 40 },
      { x: 200, y: 350, width: 50, height: 100 },
      { x: 1250, y: 400, width: 50, height: 120 },
      { x: 700, y: 800, width: 80, height: 60 },
    ],
    chargingZones: [
      { x: 80, y: 80, radius: 35, intensity: 1 },
      { x: 1520, y: 60, radius: 35, intensity: 1 },
      { x: 60, y: 920, radius: 35, intensity: 1 },
      { x: 1500, y: 940, radius: 35, intensity: 1 },
    ],
    features: [
      // Huge lava lake left side
      { type: 'hazard', x: 80, y: 250, width: 140, height: 500, damage: 2 },
      // Small lava pool top-right
      { type: 'hazard', x: 1200, y: 200, radius: 70, damage: 1.5 },
      // Medium lava pool bottom-right
      { type: 'hazard', x: 1400, y: 550, width: 120, height: 120, damage: 1.5 },
      // Tiny lava puddle mid-right
      { type: 'hazard', x: 1050, y: 620, radius: 40, damage: 1.5 },
    ]
  },
  {
    id: 'velocity-circuit',
    name: 'Velocity Circuit (Boost Lanes)',
    width: 1600,
    height: 1000,
    obstacles: [
      // Central structures
      { x: 550, y: 200, width: 30, height: 600 },
      { x: 1000, y: 100, width: 30, height: 200 },
      { x: 1000, y: 700, width: 30, height: 200 },
      // Barriers breaking sightlines
      { x: 150, y: 350, width: 120, height: 40 },
      { x: 1330, y: 600, width: 120, height: 40 },
      { x: 400, y: 750, width: 80, height: 40 },
      { x: 1200, y: 200, width: 80, height: 40 },
      // Small cover
      { x: 750, y: 150, width: 50, height: 50 },
      { x: 750, y: 800, width: 50, height: 50 },
    ],
    chargingZones: [
      { x: 80, y: 80, radius: 35, intensity: 1 },
      { x: 1520, y: 80, radius: 35, intensity: 1 },
      { x: 80, y: 920, radius: 35, intensity: 1 },
      { x: 1520, y: 920, radius: 35, intensity: 1 },
    ],
    features: [
      // Horizontal speed lanes (asymmetrical lengths)
      { type: 'speedBoost', x: 0, y: 100, width: 800, height: 40, multiplier: 2.5 },
      { type: 'speedBoost', x: 900, y: 100, width: 700, height: 40, multiplier: 2.5 },
      { type: 'speedBoost', x: 400, y: 450, width: 800, height: 40, multiplier: 2.2 },
      { type: 'speedBoost', x: 200, y: 650, width: 600, height: 40, multiplier: 2.5 },
      { type: 'speedBoost', x: 1000, y: 800, width: 600, height: 40, multiplier: 2.2 },
      // Vertical speed lanes
      { type: 'speedBoost', x: 300, y: 0, width: 40, height: 500, multiplier: 1.8 },
      { type: 'speedBoost', x: 1300, y: 300, width: 40, height: 700, multiplier: 1.8 },
      { type: 'speedBoost', x: 800, y: 500, width: 40, height: 500, multiplier: 2.0 },
    ]
  },
  {
    id: 'vortex-core',
    name: 'Vortex Core (Gravity Well)',
    width: 1600,
    height: 1000,
    obstacles: [
      // Asymmetrical ring around center
      { x: 750, y: 420, width: 100, height: 25 },
      { x: 750, y: 555, width: 100, height: 25 },
      { x: 680, y: 470, width: 25, height: 110 },
      { x: 895, y: 470, width: 25, height: 110 },
      // Outer debris scattered asymmetrically
      { x: 120, y: 120, width: 70, height: 70 },
      { x: 1400, y: 100, width: 60, height: 60 },
      { x: 100, y: 800, width: 50, height: 80 },
      { x: 1400, y: 780, width: 80, height: 50 },
      { x: 400, y: 300, width: 50, height: 50 },
      { x: 1100, y: 700, width: 60, height: 60 },
      { x: 300, y: 700, width: 40, height: 100 },
      { x: 1200, y: 200, width: 60, height: 40 },
    ],
    chargingZones: [
      { x: 80, y: 80, radius: 35, intensity: 1 },
      { x: 1520, y: 80, radius: 35, intensity: 1 },
      { x: 80, y: 920, radius: 35, intensity: 1 },
      { x: 1520, y: 920, radius: 35, intensity: 1 },
    ],
    features: [
      { type: 'gravityWell', x: 800, y: 500, radius: 350, strength: 0.1 },
      // Teleport pairs at asymmetrical positions
      { type: 'teleportPad', x: 200, y: 250, radius: 25, targetX: 1400, targetY: 750 },
      { type: 'teleportPad', x: 1400, y: 750, radius: 25, targetX: 200, targetY: 250 },
      { type: 'teleportPad', x: 1400, y: 250, radius: 25, targetX: 600, targetY: 850 },
      { type: 'teleportPad', x: 600, y: 850, radius: 25, targetX: 1400, targetY: 250 },
    ]
  }
];

export const ROBOT_PILOTS: RobotPilot[] = [
  { name: 'AGGRESSOR', behavior: 'aggressive', color: '#ff003c', type: 'assault' },
  { name: 'GUARDIAN', behavior: 'cautious', color: '#00ff3c', type: 'dreadnought' },
  { name: 'PHANTOM', behavior: 'ambusher', color: '#7f00ff', type: 'scout' },
  { name: 'HUNTER', behavior: 'aggressive', color: '#ff5a00', type: 'scout' },
  { name: 'DEFENDER', behavior: 'cautious', color: '#e0e0e0', type: 'dreadnought' },
  { name: 'RAVEN', behavior: 'sniper', color: '#0066ff', type: 'assault' },
  { name: 'VIPER', behavior: 'ambusher', color: '#ff00b4', type: 'scout' },
  { name: 'FANG', behavior: 'aggressive', color: '#ffe600', type: 'assault' },
  { name: 'SPECTRE', behavior: 'sniper', color: '#b2ff00', type: 'dreadnought' }
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
