import 'dart:ui';
import 'models.dart';

final List<Weapon> defaultWeapons = [
  Weapon(
    id: 'laser',
    name: 'Pulse Laser',
    type: 'laser',
    damage: 10,
    speed: 7,
    fuelCost: 2,
    fireRate: 250,
    color: const Color(0xFF00FFFF),
    description: 'Rapid-fire basic energy bolt. Low damage, low fuel consumption.',
    unlocked: true,
  ),
  Weapon(
    id: 'plasma',
    name: 'Heavy Plasma',
    type: 'plasma',
    damage: 30,
    speed: 4.5,
    fuelCost: 10,
    fireRate: 800,
    color: const Color(0xFFFF3366),
    description: 'Slow-moving concentrate of high-energy plasma. Heavy damage.',
    unlocked: false,
  ),
  Weapon(
    id: 'spread',
    name: 'Spread Shot',
    type: 'spread',
    damage: 12,
    speed: 6.5,
    fuelCost: 6,
    fireRate: 500,
    color: const Color(0xFFFFCC00),
    description: 'Fires three energy bolts in a spreading arc. Great for close range.',
    unlocked: false,
  ),
  Weapon(
    id: 'seeker',
    name: 'Seeker Missile',
    type: 'seeker',
    damage: 25,
    speed: 3.5,
    fuelCost: 15,
    fireRate: 1000,
    color: const Color(0xFFFF9900),
    description: 'Slow, smart rocket that tracks the nearest opponent.',
    unlocked: false,
  ),
  Weapon(
    id: 'bounce',
    name: 'Bouncing Disc',
    type: 'bounce',
    damage: 15,
    speed: 6.0,
    fuelCost: 5,
    fireRate: 400,
    color: const Color(0xFF33FF33),
    description: 'Fires a kinetic disc that bounces off walls up to 4 times.',
    unlocked: false,
  ),
  Weapon(
    id: 'mine',
    name: 'Proximity Mine',
    type: 'mine',
    damage: 35,
    speed: 0,
    fuelCost: 12,
    fireRate: 1200,
    color: const Color(0xFFCC33FF),
    description: 'Deploys a stationary cloaked explosive. Detonates when touched.',
    unlocked: false,
  ),
];

final List<Tool> defaultTools = [
  Tool(
    id: 'shield',
    name: 'Energy Shield',
    type: 'shield',
    fuelCost: 20,
    cooldown: 5000,
    description: 'Creates a temporary forcefield rendering your tank immune to damage for 2.5 seconds.',
    unlocked: false,
  ),
  Tool(
    id: 'teleport',
    name: 'Phase Blink',
    type: 'teleport',
    fuelCost: 15,
    cooldown: 3000,
    description: 'Instantly teleports your tank forward a short distance.',
    unlocked: false,
  ),
];

class TankConfig {
  final TankType type;
  final String name;
  final double speed;
  final double rotationSpeed;
  final double maxHealth;
  final double maxFuel;
  final int cost;
  final String description;

  TankConfig({
    required this.type,
    required this.name,
    required this.speed,
    required this.rotationSpeed,
    required this.maxHealth,
    required this.maxFuel,
    required this.cost,
    required this.description,
  });
}

final Map<TankType, TankConfig> tankConfigs = {
  TankType.scout: TankConfig(
    type: TankType.scout,
    name: 'Vanguard Scout',
    speed: 3.5,
    rotationSpeed: 0.08,
    maxHealth: 80,
    maxFuel: 80,
    cost: 100,
    description: 'Lightweight, extremely fast and agile, but fragile armor.',
  ),
  TankType.assault: TankConfig(
    type: TankType.assault,
    name: 'Interceptor M1',
    speed: 2.7,
    rotationSpeed: 0.06,
    maxHealth: 120,
    maxFuel: 120,
    cost: 120,
    description: 'Standard multi-role tank. Good speed, solid armor, and reliable fuel capacity.',
  ),
  TankType.dreadnought: TankConfig(
    type: TankType.dreadnought,
    name: 'Titan Dreadnought',
    speed: 1.8,
    rotationSpeed: 0.04,
    maxHealth: 180,
    maxFuel: 180,
    cost: 160,
    description: 'Slow-moving fortress. Massive armor capacity and large fuel tanks to outlast foes.',
  ),
};

class UpgradePrices {
  static const int discountMembership = 150;
  static const int tankSpeed = 80;
  static const int tankRotation = 60;
  static const int tankArmor = 100;
  static const int refillFuel = 20;
  static const int refillHealth = 30;
}

final List<Arena> arenas = [
  Arena(
    id: 'zone-alpha',
    name: 'Zone Alpha (Core Station)',
    width: 900,
    height: 600,
    obstacles: [
      RectObstacle(x: 410, y: 150, width: 80, height: 120),
      RectObstacle(x: 410, y: 330, width: 80, height: 120),
      RectObstacle(x: 200, y: 270, width: 150, height: 60),
      RectObstacle(x: 550, y: 270, width: 150, height: 60),
      RectObstacle(x: 100, y: 80, width: 60, height: 100),
      RectObstacle(x: 740, y: 80, width: 60, height: 100),
      RectObstacle(x: 100, y: 420, width: 60, height: 100),
      RectObstacle(x: 740, y: 420, width: 60, height: 100),
    ],
    chargingZones: [
      ChargingZone(x: 40, y: 40, radius: 30),
      ChargingZone(x: 860, y: 40, radius: 30),
      ChargingZone(x: 40, y: 560, radius: 30),
      ChargingZone(x: 860, y: 560, radius: 30),
    ],
  ),
  Arena(
    id: 'void-chamber',
    name: 'Void Chamber (Open Combat)',
    width: 900,
    height: 600,
    obstacles: [
      RectObstacle(x: 200, y: 150, width: 50, height: 50),
      RectObstacle(x: 650, y: 150, width: 50, height: 50),
      RectObstacle(x: 200, y: 400, width: 50, height: 50),
      RectObstacle(x: 650, y: 400, width: 50, height: 50),
      RectObstacle(x: 425, y: 275, width: 50, height: 50),
    ],
    chargingZones: [
      ChargingZone(x: 40, y: 40, radius: 30),
      ChargingZone(x: 860, y: 40, radius: 30),
      ChargingZone(x: 40, y: 560, radius: 30),
      ChargingZone(x: 860, y: 560, radius: 30),
    ],
  ),
  Arena(
    id: 'labyrinth',
    name: 'The Grid Labyrinth',
    width: 900,
    height: 600,
    obstacles: [
      RectObstacle(x: 0, y: 180, width: 250, height: 20),
      RectObstacle(x: 650, y: 180, width: 250, height: 20),
      RectObstacle(x: 250, y: 400, width: 400, height: 20),
      RectObstacle(x: 440, y: 50, width: 20, height: 180),
      RectObstacle(x: 200, y: 200, width: 20, height: 200),
      RectObstacle(x: 680, y: 200, width: 20, height: 200),
    ],
    chargingZones: [
      ChargingZone(x: 40, y: 40, radius: 30),
      ChargingZone(x: 860, y: 40, radius: 30),
      ChargingZone(x: 40, y: 560, radius: 30),
      ChargingZone(x: 860, y: 560, radius: 30),
    ],
  ),
];

Tank createDefaultTank(
  String id,
  String name,
  TankType type,
  Color color, {
  bool isRobot = false,
  String? robotBehavior,
}) {
  final config = tankConfigs[type]!;
  
  return Tank(
    id: id,
    name: name,
    type: type,
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    fuel: config.maxFuel,
    maxFuel: config.maxFuel,
    color: color,
    isRobot: isRobot,
    robotBehavior: robotBehavior,
    weapons: defaultWeapons.map((w) => w.clone()).toList(),
    tools: defaultTools.map((t) => t.clone()).toList(),
    upgrades: TankUpgrades(),
  );
}
