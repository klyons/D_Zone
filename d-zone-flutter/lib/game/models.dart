import 'dart:ui';

enum TankType { scout, assault, dreadnought }

class Weapon {
  final String id;
  final String name;
  final String type; // laser, plasma, spread, seeker, bounce, mine
  final double damage;
  final double speed;
  final double fuelCost;
  final int fireRate; // ms between shots
  final Color color;
  final String description;
  bool unlocked;

  Weapon({
    required this.id,
    required this.name,
    required this.type,
    required this.damage,
    required this.speed,
    required this.fuelCost,
    required this.fireRate,
    required this.color,
    required this.description,
    this.unlocked = false,
  });

  Weapon clone() {
    return Weapon(
      id: id,
      name: name,
      type: type,
      damage: damage,
      speed: speed,
      fuelCost: fuelCost,
      fireRate: fireRate,
      color: color,
      description: description,
      unlocked: unlocked,
    );
  }
}

class Tool {
  final String id;
  final String name;
  final String type; // shield, teleport
  final double fuelCost;
  final int cooldown; // ms
  int lastUsed; // timestamp ms
  bool unlocked;
  final String description;

  Tool({
    required this.id,
    required this.name,
    required this.type,
    required this.fuelCost,
    required this.cooldown,
    this.lastUsed = 0,
    this.unlocked = false,
    required this.description,
  });

  Tool clone() {
    return Tool(
      id: id,
      name: name,
      type: type,
      fuelCost: fuelCost,
      cooldown: cooldown,
      lastUsed: lastUsed,
      unlocked: unlocked,
      description: description,
    );
  }
}

class TankUpgrades {
  int speed;
  int rotation;
  int armor;

  TankUpgrades({
    this.speed = 0,
    this.rotation = 0,
    this.armor = 0,
  });

  TankUpgrades clone() {
    return TankUpgrades(
      speed: speed,
      rotation: rotation,
      armor: armor,
    );
  }
}

class Tank {
  final String id;
  String name;
  TankType type;
  double x;
  double y;
  double vx;
  double vy;
  double angle; // radians
  double health;
  double maxHealth;
  double fuel;
  double maxFuel;
  final Color color;
  final bool isRobot;
  final String? robotBehavior; // aggressive, cautious, ambusher, sniper
  int score;
  int money;
  bool isDead;
  int activeWeaponIndex;
  List<Weapon> weapons;
  List<Tool> tools;
  TankUpgrades upgrades;
  bool hasDiscount;
  bool shieldActive;
  int shieldDuration; // ms
  int lastFired; // timestamp ms

  Tank({
    required this.id,
    required this.name,
    required this.type,
    this.x = 0,
    this.y = 0,
    this.vx = 0,
    this.vy = 0,
    this.angle = 0,
    required this.health,
    required this.maxHealth,
    required this.fuel,
    required this.maxFuel,
    required this.color,
    required this.isRobot,
    this.robotBehavior,
    this.score = 0,
    this.money = 0,
    this.isDead = false,
    this.activeWeaponIndex = 0,
    required this.weapons,
    required this.tools,
    required this.upgrades,
    this.hasDiscount = false,
    this.shieldActive = false,
    this.shieldDuration = 2500,
    this.lastFired = 0,
  });
}

class Bullet {
  final String id;
  final String ownerId;
  double x;
  double y;
  double vx;
  double vy;
  final double damage;
  final Color color;
  final String type;
  final double radius;
  double? angle;
  int bounces;
  final int maxBounces;
  final int? lifetime; // ms
  final int createdAt; // timestamp ms

  Bullet({
    required this.id,
    required this.ownerId,
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.damage,
    required this.color,
    required this.type,
    required this.radius,
    this.angle,
    this.bounces = 0,
    this.maxBounces = 0,
    this.lifetime,
    required this.createdAt,
  });
}

class RectObstacle {
  final double x;
  final double y;
  final double width;
  final double height;

  RectObstacle({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });
}

class ChargingZone {
  final double x;
  final double y;
  final double radius;

  ChargingZone({
    required this.x,
    required this.y,
    required this.radius,
  });
}

class Arena {
  final String id;
  final String name;
  final double width;
  final double height;
  final List<RectObstacle> obstacles;
  final List<ChargingZone> chargingZones;

  Arena({
    required this.id,
    required this.name,
    required this.width,
    required this.height,
    required this.obstacles,
    required this.chargingZones,
  });
}

class GameSettings {
  int humanPlayers;
  int robotCount;
  int roundLimit;
  int timeLimit; // seconds
  bool soundEnabled;
  String arenaId;

  GameSettings({
    this.humanPlayers = 1,
    this.robotCount = 3,
    this.roundLimit = 9,
    this.timeLimit = 90,
    this.soundEnabled = true,
    this.arenaId = 'zone-alpha',
  });
}
