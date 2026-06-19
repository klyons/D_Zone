import 'dart:math';
import 'package:flutter/services.dart';
import 'models.dart';
import 'constants.dart';

const double tankRadius = 18.0;
const double bulletRadius = 4.0;

double _clamp(double val, double min, double max) {
  return Math.max(min, Math.min(max, val));
}

// Math max helper as Dart Math is lowercase for lowercase constants, but Capitalized max/min? No, max/min in dart:math are functions: `max(a, b)` and `min(a, b)`. Let's correct this. In Dart, we just write `val.clamp(min, max)`. Double has a `.clamp` method! That is super clean.
class MathHelper {
  static double clamp(double val, double min, double max) {
    return val.clamp(min, max);
  }
}

void resolveTankObstacleCollision(Tank tank, RectObstacle rect) {
  final closestX = tank.x.clamp(rect.x, rect.x + rect.width);
  final closestY = tank.y.clamp(rect.y, rect.y + rect.height);

  final dx = tank.x - closestX;
  final dy = tank.y - closestY;
  final dist = sqrt(dx * dx + dy * dy);

  if (dist < tankRadius) {
    final overlap = tankRadius - dist;
    double nx = 0;
    double ny = 0;

    if (dist == 0) {
      final dl = tank.x - rect.x;
      final dr = rect.x + rect.width - tank.x;
      final dt = tank.y - rect.y;
      final db = rect.y + rect.height - tank.y;

      final minDist = [dl, dr, dt, db].reduce(min);
      if (minDist == dl) { tank.x -= tankRadius; nx = -1; }
      else if (minDist == dr) { tank.x += tankRadius; nx = 1; }
      else if (minDist == dt) { tank.y -= tankRadius; ny = -1; }
      else { tank.y += tankRadius; ny = 1; }
    } else {
      nx = dx / dist;
      ny = dy / dist;
      tank.x += nx * overlap;
      tank.y += ny * overlap;
    }

    final dot = tank.vx * nx + tank.vy * ny;
    if (dot < 0) {
      tank.vx -= dot * nx * 1.3;
      tank.vy -= dot * ny * 1.3;
    }
  }
}

void resolveTankTankCollision(Tank t1, Tank t2) {
  if (t1.isDead || t2.isDead) return;

  final dx = t2.x - t1.x;
  final dy = t2.y - t1.y;
  final dist = sqrt(dx * dx + dy * dy);
  const minDist = tankRadius * 2.0;

  if (dist < minDist) {
    final overlap = minDist - dist;
    final nx = dx / (dist == 0 ? 1.0 : dist);
    final ny = dy / (dist == 0 ? 1.0 : dist);

    t1.x -= nx * (overlap / 2.0);
    t1.y -= ny * (overlap / 2.0);
    t2.x += nx * (overlap / 2.0);
    t2.y += ny * (overlap / 2.0);

    final kx = t1.vx - t2.vx;
    final ky = t1.vy - t2.vy;
    final p = nx * kx + ny * ky;

    if (p > 0) {
      t1.vx -= nx * p;
      t1.vy -= ny * p;
      t2.vx += nx * p;
      t2.vy += ny * p;
    }
  }
}

class EngineResult {
  final List<Tank> tanks;
  final List<Bullet> bullets;

  EngineResult({required this.tanks, required this.bullets});
}

EngineResult runEngineUpdate(
  List<Tank> tanks,
  List<Bullet> bullets,
  Arena arena,
  Map<LogicalKeyboardKey, bool> keysPressed,
  GameSettings settings,
  int timestampMs,
  double p1JoyX,
  double p1JoyY,
  bool p1VFire,
  bool p1VTool,
) {
  // 1. Update tanks
  for (var tank in tanks) {
    if (tank.isDead) continue;

    final config = tankConfigs[tank.type]!;
    final speedMultiplier = 1.0 + tank.upgrades.speed * 0.15;
    final rotMultiplier = 1.0 + tank.upgrades.rotation * 0.2;
    final maxSpeed = config.speed * speedMultiplier;
    final rotationSpeed = config.rotationSpeed * rotMultiplier;

    bool forward = false;
    bool backward = false;
    bool turnLeft = false;
    bool turnRight = false;
    bool fire = false;
    bool useTool = false;

    if (!tank.isRobot) {
      if (tank.id == 'p1') {
        // Keyboard inputs
        forward = keysPressed[LogicalKeyboardKey.arrowUp] == true || keysPressed[LogicalKeyboardKey.keyW] == true;
        backward = keysPressed[LogicalKeyboardKey.arrowDown] == true || keysPressed[LogicalKeyboardKey.keyS] == true;
        turnLeft = keysPressed[LogicalKeyboardKey.arrowLeft] == true || keysPressed[LogicalKeyboardKey.keyA] == true;
        turnRight = keysPressed[LogicalKeyboardKey.arrowRight] == true || keysPressed[LogicalKeyboardKey.keyD] == true;
        fire = keysPressed[LogicalKeyboardKey.space] == true || keysPressed[LogicalKeyboardKey.shiftLeft] == true || keysPressed[LogicalKeyboardKey.shiftRight] == true || p1VFire;
        useTool = keysPressed[LogicalKeyboardKey.keyQ] == true || keysPressed[LogicalKeyboardKey.period] == true || p1VTool;

        // Virtual joystick support (mobile overrides keyboard)
        if (p1JoyX != 0 || p1JoyY != 0) {
          final targetAngle = atan2(p1JoyY, p1JoyX);
          double diff = targetAngle - tank.angle;
          while (diff < -pi) diff += pi * 2;
          while (diff > pi) diff -= pi * 2;

          if (diff > 0.05) turnRight = true;
          else if (diff < -0.05) turnLeft = true;

          final dist = sqrt(p1JoyX * p1JoyX + p1JoyY * p1JoyY);
          if (dist > 0.15) {
            forward = true;
          }
        }
      } else if (tank.id == 'p2') {
        forward = keysPressed[LogicalKeyboardKey.keyI] == true;
        backward = keysPressed[LogicalKeyboardKey.keyK] == true;
        turnLeft = keysPressed[LogicalKeyboardKey.keyJ] == true;
        turnRight = keysPressed[LogicalKeyboardKey.keyL] == true;
        fire = keysPressed[LogicalKeyboardKey.keyF] == true || keysPressed[LogicalKeyboardKey.keyH] == true;
        useTool = keysPressed[LogicalKeyboardKey.keyU] == true;
      }
    } else {
      // Robot AI
      final behavior = tank.robotBehavior ?? 'aggressive';

      Tank? closestTarget;
      double closestDist = double.infinity;
      for (var other in tanks) {
        if (other.id == tank.id || other.isDead) continue;
        final d = sqrt(pow(other.x - tank.x, 2) + pow(other.y - tank.y, 2));
        if (d < closestDist) {
          closestDist = d;
          closestTarget = other;
        }
      }

      final needsRecharge = tank.fuel < tank.maxFuel * 0.25 || (tank.health < tank.maxHealth * 0.3 && behavior == 'cautious');
      double targetX = closestTarget != null ? closestTarget.x : arena.width / 2;
      double targetY = closestTarget != null ? closestTarget.y : arena.height / 2;

      if (needsRecharge && arena.chargingZones.isNotEmpty) {
        var nearestZone = arena.chargingZones[0];
        double minDist = double.infinity;
        for (var zone in arena.chargingZones) {
          final d = sqrt(pow(zone.x - tank.x, 2) + pow(zone.y - tank.y, 2));
          if (d < minDist) {
            minDist = d;
            nearestZone = zone;
          }
        }
        targetX = nearestZone.x;
        targetY = nearestZone.y;
      }

      final angleToTarget = atan2(targetY - tank.y, targetX - tank.x);
      double diff = angleToTarget - tank.angle;
      while (diff < -pi) diff += pi * 2;
      while (diff > pi) diff -= pi * 2;

      if (diff > 0.05) turnRight = true;
      else if (diff < -0.05) turnLeft = true;

      if (closestTarget != null) {
        if (needsRecharge) {
          forward = true;
        } else {
          final rand = Random();
          if (behavior == 'aggressive') {
            forward = closestDist > 120;
            backward = closestDist < 60;
            if (diff.abs() < 0.25 && rand.nextDouble() < 0.08) fire = true;
          } else if (behavior == 'cautious') {
            forward = closestDist > 220;
            backward = closestDist < 160;
            if (diff.abs() < 0.2 && rand.nextDouble() < 0.04) fire = true;
          } else if (behavior == 'sniper') {
            forward = closestDist > 300;
            backward = closestDist < 200;
            if (diff.abs() < 0.08 && rand.nextDouble() < 0.05) fire = true;
            
            final plasmaIdx = tank.weapons.indexWhere((w) => w.type == 'plasma');
            if (plasmaIdx != -1 && tank.weapons[plasmaIdx].unlocked && tank.activeWeaponIndex != plasmaIdx) {
              tank.activeWeaponIndex = plasmaIdx;
            }
          } else if (behavior == 'ambusher') {
            forward = rand.nextDouble() < 0.7;
            if (rand.nextDouble() < 0.02) {
              final mineIdx = tank.weapons.indexWhere((w) => w.type == 'mine');
              if (mineIdx != -1 && tank.weapons[mineIdx].unlocked) {
                tank.activeWeaponIndex = mineIdx;
                fire = true;
              }
            } else if (diff.abs() < 0.3 && rand.nextDouble() < 0.06) {
              fire = true;
            }
          }

          if (closestDist < 100 && rand.nextDouble() < 0.02) {
            useTool = true;
          }
        }
      } else {
        forward = Random().nextDouble() < 0.5;
      }
    }

    if (turnLeft) tank.angle -= rotationSpeed;
    if (turnRight) tank.angle += rotationSpeed;
    while (tank.angle < -pi) tank.angle += pi * 2;
    while (tank.angle > pi) tank.angle -= pi * 2;

    const acceleration = 0.12;
    const friction = 0.95;

    if (forward) {
      tank.vx += cos(tank.angle) * acceleration;
      tank.vy += sin(tank.angle) * acceleration;
    } else if (backward) {
      tank.vx -= cos(tank.angle) * acceleration * 0.6;
      tank.vy -= sin(tank.angle) * acceleration * 0.6;
    }

    tank.vx *= friction;
    tank.vy *= friction;

    final currSpeed = sqrt(tank.vx * tank.vx + tank.vy * tank.vy);
    if (currSpeed > maxSpeed) {
      tank.vx = (tank.vx / currSpeed) * maxSpeed;
      tank.vy = (tank.vy / currSpeed) * maxSpeed;
    }

    tank.x += tank.vx;
    tank.y += tank.vy;

    // Boundary constraints
    if (tank.x < tankRadius) { tank.x = tankRadius; tank.vx *= -0.5; }
    if (tank.x > arena.width - tankRadius) { tank.x = arena.width - tankRadius; tank.vx *= -0.5; }
    if (tank.y < tankRadius) { tank.y = tankRadius; tank.vy *= -0.5; }
    if (tank.y > arena.height - tankRadius) { tank.y = arena.height - tankRadius; tank.vy *= -0.5; }

    // Obstacles
    for (var obstacle in arena.obstacles) {
      resolveTankObstacleCollision(tank, obstacle);
    }

    // Chargers
    bool isRecharging = false;
    for (var zone in arena.chargingZones) {
      final dx = tank.x - zone.x;
      final dy = tank.y - zone.y;
      final dist = sqrt(dx * dx + dy * dy);
      if (dist < zone.radius + tankRadius - 5.0) {
        isRecharging = true;
      }
    }

    if (isRecharging) {
      if (tank.fuel < tank.maxFuel) {
        tank.fuel = (tank.fuel + 0.5).clamp(0.0, tank.maxFuel);
      }
      if (tank.health < tank.maxHealth && Random().nextDouble() < 0.02) {
        tank.health = (tank.health + 1.0).clamp(0.0, tank.maxHealth);
      }
    }

    if (tank.shieldActive) {
      tank.shieldDuration -= 16;
      if (tank.shieldDuration <= 0) {
        tank.shieldActive = false;
        tank.shieldDuration = 2500;
      }
    }

    // Tools
    if (useTool) {
      final toolIdx = tank.tools.indexWhere((t) => t.unlocked);
      if (toolIdx != -1) {
        final tool = tank.tools[toolIdx];
        if (timestampMs - tool.lastUsed > tool.cooldown && tank.fuel >= tool.fuelCost) {
          tank.fuel -= tool.fuelCost;
          tool.lastUsed = timestampMs;

          if (tool.type == 'shield') {
            tank.shieldActive = true;
            tank.shieldDuration = 2500;
          } else if (tool.type == 'teleport') {
            const dist = 100.0;
            final blinkX = tank.x + cos(tank.angle) * dist;
            final blinkY = tank.y + sin(tank.angle) * dist;

            bool safe = true;
            if (blinkX < tankRadius || blinkX > arena.width - tankRadius || blinkY < tankRadius || blinkY > arena.height - tankRadius) {
              safe = false;
            }
            for (var obstacle in arena.obstacles) {
              final cx = blinkX.clamp(obstacle.x, obstacle.x + obstacle.width);
              final cy = blinkY.clamp(obstacle.y, obstacle.y + obstacle.height);
              final d = sqrt((blinkX - cx) * (blinkX - cx) + (blinkY - cy) * (blinkY - cy));
              if (d < tankRadius) safe = false;
            }

            if (safe) {
              tank.x = blinkX;
              tank.y = blinkY;
            }
          }
        }
      }
    }

    // Firing
    if (fire) {
      final activeWeapon = tank.weapons[tank.activeWeaponIndex];
      if (activeWeapon.unlocked && timestampMs - tank.lastFired > activeWeapon.fireRate && tank.fuel >= activeWeapon.fuelCost) {
        tank.fuel -= activeWeapon.fuelCost;
        tank.lastFired = timestampMs;

        if (activeWeapon.type == 'laser') {
          bullets.add(Bullet(
            id: Random().nextDouble().toString(),
            ownerId: tank.id,
            x: tank.x + cos(tank.angle) * tankRadius,
            y: tank.y + sin(tank.angle) * tankRadius,
            vx: cos(tank.angle) * activeWeapon.speed + tank.vx * 0.3,
            vy: sin(tank.angle) * activeWeapon.speed + tank.vy * 0.3,
            damage: activeWeapon.damage,
            color: activeWeapon.color,
            type: 'laser',
            radius: bulletRadius,
            createdAt: timestampMs,
          ));
        } else if (activeWeapon.type == 'plasma') {
          bullets.add(Bullet(
            id: Random().nextDouble().toString(),
            ownerId: tank.id,
            x: tank.x + cos(tank.angle) * tankRadius,
            y: tank.y + sin(tank.angle) * tankRadius,
            vx: cos(tank.angle) * activeWeapon.speed,
            vy: sin(tank.angle) * activeWeapon.speed,
            damage: activeWeapon.damage,
            color: activeWeapon.color,
            type: 'plasma',
            radius: bulletRadius * 2,
            createdAt: timestampMs,
          ));
        } else if (activeWeapon.type == 'spread') {
          final offsets = [-0.2, 0.0, 0.2];
          for (var offset in offsets) {
            final a = tank.angle + offset;
            bullets.add(Bullet(
              id: Random().nextDouble().toString(),
              ownerId: tank.id,
              x: tank.x + cos(a) * tankRadius,
              y: tank.y + sin(a) * tankRadius,
              vx: cos(a) * activeWeapon.speed,
              vy: sin(a) * activeWeapon.speed,
              damage: activeWeapon.damage,
              color: activeWeapon.color,
              type: 'spread',
              radius: bulletRadius,
              createdAt: timestampMs,
            ));
          }
        } else if (activeWeapon.type == 'seeker') {
          bullets.add(Bullet(
            id: Random().nextDouble().toString(),
            ownerId: tank.id,
            x: tank.x + cos(tank.angle) * tankRadius,
            y: tank.y + sin(tank.angle) * tankRadius,
            vx: cos(tank.angle) * activeWeapon.speed,
            vy: sin(tank.angle) * activeWeapon.speed,
            damage: activeWeapon.damage,
            color: activeWeapon.color,
            type: 'seeker',
            radius: bulletRadius * 1.5,
            createdAt: timestampMs,
          ));
        } else if (activeWeapon.type == 'bounce') {
          bullets.add(Bullet(
            id: Random().nextDouble().toString(),
            ownerId: tank.id,
            x: tank.x + cos(tank.angle) * tankRadius,
            y: tank.y + sin(tank.angle) * tankRadius,
            vx: cos(tank.angle) * activeWeapon.speed,
            vy: sin(tank.angle) * activeWeapon.speed,
            damage: activeWeapon.damage,
            color: activeWeapon.color,
            type: 'bounce',
            radius: bulletRadius * 1.2,
            maxBounces: 4,
            createdAt: timestampMs,
          ));
        } else if (activeWeapon.type == 'mine') {
          bullets.add(Bullet(
            id: Random().nextDouble().toString(),
            ownerId: tank.id,
            x: tank.x - cos(tank.angle) * tankRadius * 1.2,
            y: tank.y - sin(tank.angle) * tankRadius * 1.2,
            vx: 0,
            vy: 0,
            damage: activeWeapon.damage,
            color: activeWeapon.color,
            type: 'mine',
            radius: bulletRadius * 2,
            lifetime: 20000,
            createdAt: timestampMs,
          ));
        }
      }
    }
  }

  // 2. Tank collisions
  for (int i = 0; i < tanks.length; i++) {
    for (int j = i + 1; j < tanks.length; j++) {
      resolveTankTankCollision(tanks[i], tanks[j]);
    }
  }

  // 3. Update bullets
  final List<Bullet> activeBullets = [];
  for (var bullet in bullets) {
    if (bullet.type == 'mine') {
      bool exploded = false;
      if (bullet.lifetime != null && timestampMs - bullet.createdAt > bullet.lifetime!) {
        exploded = true;
      }

      for (var tank in tanks) {
        if (tank.isDead || tank.id == bullet.ownerId) continue;
        final d = sqrt(pow(tank.x - bullet.x, 2) + pow(tank.y - bullet.y, 2));
        if (d < 26.0) {
          exploded = true;
          if (!tank.shieldActive) {
            tank.health = (tank.health - bullet.damage).clamp(0.0, tank.maxHealth);
            if (tank.health <= 0 && !tank.isDead) {
              tank.isDead = true;
              final killer = tanks.firstWhere((t) => t.id == bullet.ownerId);
              killer.score += 100;
              killer.money += 60;
            }
          }
        }
      }

      if (!exploded) {
        activeBullets.add(bullet);
      }
      continue;
    }

    if (bullet.type == 'seeker') {
      Tank? target;
      double minDist = double.infinity;
      for (var tank in tanks) {
        if (tank.isDead || tank.id == bullet.ownerId) continue;
        final d = sqrt(pow(tank.x - bullet.x, 2) + pow(tank.y - bullet.y, 2));
        if (d < minDist) {
          minDist = d;
          target = tank;
        }
      }

      if (target != null) {
        final dx = target.x - bullet.x;
        final dy = target.y - bullet.y;
        final targetAngle = atan2(dy, dx);
        
        double currAngle = atan2(bullet.vy, bullet.vx);
        double diff = targetAngle - currAngle;
        while (diff < -pi) diff += pi * 2;
        while (diff > pi) diff -= pi * 2;

        const turnRate = 0.04;
        currAngle += diff.clamp(-turnRate, turnRate);

        const speed = 4.0;
        bullet.vx = cos(currAngle) * speed;
        bullet.vy = sin(currAngle) * speed;
      }
    }

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    bool hitWall = false;
    double normalX = 0;
    double normalY = 0;

    if (bullet.x < 0) { hitWall = true; bullet.x = 0; normalX = 1; }
    if (bullet.x > arena.width) { hitWall = true; bullet.x = arena.width; normalX = -1; }
    if (bullet.y < 0) { hitWall = true; bullet.y = 0; normalY = 1; }
    if (bullet.y > arena.height) { hitWall = true; bullet.y = arena.height; normalY = -1; }

    if (!hitWall) {
      for (var obstacle in arena.obstacles) {
        final cx = bullet.x.clamp(obstacle.x, obstacle.x + obstacle.width);
        final cy = bullet.y.clamp(obstacle.y, obstacle.y + obstacle.height);
        final d = sqrt((bullet.x - cx) * (bullet.x - cx) + (bullet.y - cy) * (bullet.y - cy));

        if (d < bullet.radius) {
          hitWall = true;
          final dl = (bullet.x - obstacle.x).abs();
          final dr = (bullet.x - (obstacle.x + obstacle.width)).abs();
          final dt = (bullet.y - obstacle.y).abs();
          final db = (bullet.y - (obstacle.y + obstacle.height)).abs();
          final m = [dl, dr, dt, db].reduce(min);
          if (m == dl) normalX = -1;
          else if (m == dr) normalX = 1;
          else if (m == dt) normalY = -1;
          else normalY = 1;
          break;
        }
      }
    }

    if (hitWall) {
      if (bullet.type == 'bounce' && bullet.bounces < bullet.maxBounces) {
        bullet.bounces++;
        if (normalX != 0) bullet.vx = -bullet.vx;
        if (normalY != 0) bullet.vy = -bullet.vy;
        activeBullets.add(bullet);
      }
      continue;
    }

    bool hitTank = false;
    for (var tank in tanks) {
      if (tank.isDead || tank.id == bullet.ownerId) continue;
      final dist = sqrt(pow(tank.x - bullet.x, 2) + pow(tank.y - bullet.y, 2));
      if (dist < tankRadius + bullet.radius) {
        hitTank = true;
        if (!tank.shieldActive) {
          tank.health = (tank.health - bullet.damage).clamp(0.0, tank.maxHealth);
          if (tank.health <= 0) {
            tank.isDead = true;
            final killer = tanks.firstWhere((t) => t.id == bullet.ownerId);
            killer.score += 100;
            killer.money += 60;
          }
        }
        break;
      }
    }

    if (!hitTank) {
      activeBullets.add(bullet);
    }
  }

  return EngineResult(tanks: tanks, bullets: activeBullets);
}

void arrangeTanksAtSpawns(List<Tank> tanks, Arena arena) {
  final positions = [
    _SpawnPos(100, 150, 0),
    _SpawnPos(arena.width - 100, arena.height - 150, pi),
    _SpawnPos(arena.width - 100, 150, pi / 2),
    _SpawnPos(100, arena.height - 150, -pi / 2),
    _SpawnPos(arena.width / 2, 80, pi / 2),
    _SpawnPos(arena.width / 2, arena.height - 80, -pi / 2),
  ];

  for (int i = 0; i < tanks.length; i++) {
    final pos = positions[i % positions.length];
    final tank = tanks[i];
    tank.x = pos.x;
    tank.y = pos.y;
    tank.vx = 0;
    tank.vy = 0;
    tank.angle = pos.angle;
    tank.health = tank.maxHealth;
    tank.fuel = tank.maxFuel;
    tank.isDead = false;
    tank.shieldActive = false;
  }
}

class _SpawnPos {
  final double x;
  final double y;
  final double angle;

  _SpawnPos(this.x, this.y, this.angle);
}
