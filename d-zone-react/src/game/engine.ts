import { Tank, Bullet, Arena, RectObstacle, GameSettings } from './types';
import { TANK_DEFS, createDefaultTank } from './constants';
import { sound } from './sound';

// Helpers
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export const TANK_RADIUS = 18;
export const BULLET_RADIUS = 4;

// Circle vs AABB (Rectangle) collision resolution
export function resolveTankObstacleCollision(tank: Tank, rect: RectObstacle) {
  const closestX = clamp(tank.x, rect.x, rect.x + rect.width);
  const closestY = clamp(tank.y, rect.y, rect.y + rect.height);

  const dx = tank.x - closestX;
  const dy = tank.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < TANK_RADIUS) {
    // Collision detected
    const overlap = TANK_RADIUS - dist;
    
    let nx = 0;
    let ny = 0;

    if (dist === 0) {
      // Tank center is inside the rectangle; push out towards the closest edge
      const dl = tank.x - rect.x;
      const dr = rect.x + rect.width - tank.x;
      const dt = tank.y - rect.y;
      const db = rect.y + rect.height - tank.y;

      const minDist = Math.min(dl, dr, dt, db);
      if (minDist === dl) { tank.x -= TANK_RADIUS; nx = -1; }
      else if (minDist === dr) { tank.x += TANK_RADIUS; nx = 1; }
      else if (minDist === dt) { tank.y -= TANK_RADIUS; ny = -1; }
      else { tank.y += TANK_RADIUS; ny = 1; }
    } else {
      nx = dx / dist;
      ny = dy / dist;
      tank.x += nx * overlap;
      tank.y += ny * overlap;
    }

    // Reflect velocity slightly and slide
    const dot = tank.vx * nx + tank.vy * ny;
    if (dot < 0) {
      tank.vx -= dot * nx * 1.3;
      tank.vy -= dot * ny * 1.3;
    }
  }
}

// Circle vs Circle collision resolution (Tanks)
export function resolveTankTankCollision(t1: Tank, t2: Tank) {
  if (t1.isDead || t2.isDead) return;

  const dx = t2.x - t1.x;
  const dy = t2.y - t1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = TANK_RADIUS * 2;

  if (dist < minDist) {
    const overlap = minDist - dist;
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);

    // Push apart equally
    t1.x -= nx * (overlap / 2);
    t1.y -= ny * (overlap / 2);
    t2.x += nx * (overlap / 2);
    t2.y += ny * (overlap / 2);

    // Swap velocities (elastic collision style)
    const kx = t1.vx - t2.vx;
    const ky = t1.vy - t2.vy;
    const p = nx * kx + ny * ky;

    if (p > 0) {
      t1.vx -= nx * p;
      t1.vy -= ny * p;
      t2.vx += nx * p;
      t2.vy += ny * p;
    }
  }
}

// Main physics updates
export function updateGameFrame(
  tanks: Tank[],
  bullets: Bullet[],
  arena: Arena,
  keysPressed: Record<string, boolean>,
  settings: GameSettings,
  timestamp: number
): { tanks: Tank[]; bullets: Bullet[]; particleSpawns: Array<{ x: number, y: number, color: string, speed: number }> } {
  const particleSpawns: Array<{ x: number, y: number, color: string, speed: number }> = [];

  // 1. Update Tanks
  tanks.forEach((tank) => {
    if (tank.isDead) return;

    // Movement rates
    const baseDef = TANK_DEFS[tank.type];
    const speedMultiplier = 1 + tank.upgrades.speed * 0.15;
    const rotMultiplier = 1 + tank.upgrades.rotation * 0.2;
    const maxSpeed = baseDef.speed * speedMultiplier;
    const rotationSpeed = baseDef.rotationSpeed * rotMultiplier;

    // Handle human inputs or Robot AI
    let forward = false;
    let backward = false;
    let turnLeft = false;
    let turnRight = false;
    let fire = false;
    let changeWeapon = false;
    let useTool = false;

    if (!tank.isRobot) {
      // Player 1 controls
      if (tank.id === 'p1') {
        forward = keysPressed['ArrowUp'] || keysPressed['KeyW'];
        backward = keysPressed['ArrowDown'] || keysPressed['KeyS'];
        turnLeft = keysPressed['ArrowLeft'] || keysPressed['KeyA'];
        turnRight = keysPressed['ArrowRight'] || keysPressed['KeyD'];
        fire = keysPressed['Space'] || keysPressed['ShiftLeft'] || keysPressed['ShiftRight'];
        changeWeapon = keysPressed['KeyE'] || keysPressed['Slash'];
        useTool = keysPressed['KeyQ'] || keysPressed['Period'];
      }
      // Player 2 controls
      else if (tank.id === 'p2') {
        forward = keysPressed['KeyI'];
        backward = keysPressed['KeyK'];
        turnLeft = keysPressed['KeyJ'];
        turnRight = keysPressed['KeyL'];
        fire = keysPressed['KeyF'] || keysPressed['KeyH'];
        changeWeapon = keysPressed['KeyO'];
        useTool = keysPressed['KeyU'];
      }
    } else {
      // Robot AI Logic
      const behavior = tank.robotBehavior || 'aggressive';
      
      // Target finding: find closest alive enemy (human or other robot of different team/free for all)
      let closestTarget: Tank | null = null;
      let closestDist = Infinity;
      tanks.forEach((other) => {
        if (other.id === tank.id || other.isDead) return;
        const dist = Math.sqrt((other.x - tank.x) ** 2 + (other.y - tank.y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestTarget = other;
        }
      });

      // Charging zone check: if low on fuel/health, cautious robots run for chargers
      const needsRecharge = tank.fuel < tank.maxFuel * 0.25 || (tank.health < tank.maxHealth * 0.3 && behavior === 'cautious');
      let targetX = closestTarget ? (closestTarget as Tank).x : arena.width / 2;
      let targetY = closestTarget ? (closestTarget as Tank).y : arena.height / 2;

      if (needsRecharge && arena.chargingZones.length > 0) {
        // Head to nearest charger
        let nearestZone = arena.chargingZones[0];
        let minDist = Infinity;
        arena.chargingZones.forEach((zone) => {
          const dist = Math.sqrt((zone.x - tank.x) ** 2 + (zone.y - tank.y) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearestZone = zone;
          }
        });
        targetX = nearestZone.x;
        targetY = nearestZone.y;
      }

      // Turn towards target
      const angleToTarget = Math.atan2(targetY - tank.y, targetX - tank.x);
      let diff = angleToTarget - tank.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Small deadzone to prevent jitter
      if (diff > 0.05) turnRight = true;
      else if (diff < -0.05) turnLeft = true;

      // Distance checking
      if (closestTarget) {
        if (needsRecharge) {
          // Just run forward to charger
          forward = true;
        } else {
          // Behavior adjustments
          if (behavior === 'aggressive') {
            forward = closestDist > 120;
            backward = closestDist < 60;
            // High fire probability if pointing near target
            if (Math.abs(diff) < 0.25 && Math.random() < 0.08) {
              fire = true;
            }
          } else if (behavior === 'cautious') {
            forward = closestDist > 220;
            backward = closestDist < 160;
            if (Math.abs(diff) < 0.2 && Math.random() < 0.04) {
              fire = true;
            }
          } else if (behavior === 'sniper') {
            forward = closestDist > 300;
            backward = closestDist < 200;
            // Only fire when aligned
            if (Math.abs(diff) < 0.08 && Math.random() < 0.05) {
              fire = true;
            }
            // Sniper cycles to plasma if unlocked, else laser
            const plasmaIdx = tank.weapons.findIndex(w => w.type === 'plasma');
            if (plasmaIdx !== -1 && tank.weapons[plasmaIdx].unlocked && tank.activeWeaponIndex !== plasmaIdx) {
              tank.activeWeaponIndex = plasmaIdx;
            }
          } else if (behavior === 'ambusher') {
            // Random movement and drop mines
            forward = Math.random() < 0.7;
            if (Math.random() < 0.02) {
              const mineIdx = tank.weapons.findIndex(w => w.type === 'mine');
              if (mineIdx !== -1 && tank.weapons[mineIdx].unlocked) {
                tank.activeWeaponIndex = mineIdx;
                fire = true;
              }
            } else if (Math.abs(diff) < 0.3 && Math.random() < 0.06) {
              fire = true;
            }
          }

          // Use defensive shields or blink
          if (closestDist < 100 && Math.random() < 0.02) {
            useTool = true;
          }
        }
      } else {
        forward = Math.random() < 0.5;
      }
    }

    // Apply rotation
    if (turnLeft) tank.angle -= rotationSpeed;
    if (turnRight) tank.angle += rotationSpeed;
    // Normalize angle
    while (tank.angle < -Math.PI) tank.angle += Math.PI * 2;
    while (tank.angle > Math.PI) tank.angle -= Math.PI * 2;

    // Apply thrust (forward/backward acceleration)
    const acceleration = 0.12;
    const friction = 0.95;

    if (forward) {
      tank.vx += Math.cos(tank.angle) * acceleration;
      tank.vy += Math.sin(tank.angle) * acceleration;
    } else if (backward) {
      tank.vx -= Math.cos(tank.angle) * acceleration * 0.6;
      tank.vy -= Math.sin(tank.angle) * acceleration * 0.6;
    }

    // Apply friction/drag
    tank.vx *= friction;
    tank.vy *= friction;

    // Cap velocity
    const currSpeed = Math.sqrt(tank.vx * tank.vx + tank.vy * tank.vy);
    if (currSpeed > maxSpeed) {
      tank.vx = (tank.vx / currSpeed) * maxSpeed;
      tank.vy = (tank.vy / currSpeed) * maxSpeed;
    }

    // Update position
    tank.x += tank.vx;
    tank.y += tank.vy;

    // Keep inside boundaries (with simple circle push-back)
    if (tank.x < TANK_RADIUS) { tank.x = TANK_RADIUS; tank.vx *= -0.5; }
    if (tank.x > arena.width - TANK_RADIUS) { tank.x = arena.width - TANK_RADIUS; tank.vx *= -0.5; }
    if (tank.y < TANK_RADIUS) { tank.y = TANK_RADIUS; tank.vy *= -0.5; }
    if (tank.y > arena.height - TANK_RADIUS) { tank.y = arena.height - TANK_RADIUS; tank.vy *= -0.5; }

    // Obstacle collisions
    arena.obstacles.forEach((obstacle) => {
      resolveTankObstacleCollision(tank, obstacle);
    });

    // Recharging zones logic
    let isRecharging = false;
    arena.chargingZones.forEach((zone) => {
      const dx = tank.x - zone.x;
      const dy = tank.y - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < zone.radius + TANK_RADIUS - 5) {
        isRecharging = true;
      }
    });

    if (isRecharging) {
      const chargeSpeed = 0.5;
      if (tank.fuel < tank.maxFuel) {
        tank.fuel = Math.min(tank.maxFuel, tank.fuel + chargeSpeed);
        if (Math.random() < 0.08) {
          sound.playCharge();
          particleSpawns.push({ x: tank.x, y: tank.y, color: '#00ffff', speed: 1.5 });
        }
      }
      // Slowly repair health in corner
      if (tank.health < tank.maxHealth && Math.random() < 0.02) {
        tank.health = Math.min(tank.maxHealth, tank.health + 1);
        particleSpawns.push({ x: tank.x, y: tank.y, color: '#33ff33', speed: 1.0 });
      }
    }

    // Shield active reduction
    if (tank.shieldActive) {
      tank.shieldDuration -= 16.67; // approx ms per frame
      if (tank.shieldDuration <= 0) {
        tank.shieldActive = false;
        tank.shieldDuration = 2500;
      }
    }

    // Weapon change debounce
    if (changeWeapon && !tank.isRobot) {
      // We debounce manually outside or do it on keydown.
      // If doing in continuous frames, we need to make sure we don't spin weapon selection instantly.
      // Let's assume keysPressed has a cooldown or handles single press elsewhere.
    }

    // Tool usage
    if (useTool) {
      const tool = tank.tools.find(t => t.unlocked); // check for first unlocked tool
      if (tool && timestamp - tool.lastUsed > tool.cooldown) {
        if (tank.fuel >= tool.fuelCost) {
          tank.fuel -= tool.fuelCost;
          tool.lastUsed = timestamp;

          if (tool.type === 'shield') {
            tank.shieldActive = true;
            tank.shieldDuration = 2500;
            sound.playShield();
          } else if (tool.type === 'teleport') {
            // Blink forward 100px
            const dist = 100;
            const blinkX = tank.x + Math.cos(tank.angle) * dist;
            const blinkY = tank.y + Math.sin(tank.angle) * dist;

            // Simple safety boundary check, check if inside walls before teleporting
            let safe = true;
            if (blinkX < TANK_RADIUS || blinkX > arena.width - TANK_RADIUS || blinkY < TANK_RADIUS || blinkY > arena.height - TANK_RADIUS) {
              safe = false;
            }
            arena.obstacles.forEach((obstacle) => {
              const cx = clamp(blinkX, obstacle.x, obstacle.x + obstacle.width);
              const cy = clamp(blinkY, obstacle.y, obstacle.y + obstacle.height);
              const d = Math.sqrt((blinkX - cx) ** 2 + (blinkY - cy) ** 2);
              if (d < TANK_RADIUS) safe = false;
            });

            if (safe) {
              // Create spawn particles at old pos
              particleSpawns.push({ x: tank.x, y: tank.y, color: '#ff33ff', speed: 3 });
              tank.x = blinkX;
              tank.y = blinkY;
              sound.playTeleport();
            }
          }
        }
      }
    }

    // Weapon firing
    if (fire) {
      const activeWeapon = tank.weapons[tank.activeWeaponIndex];
      if (activeWeapon && activeWeapon.unlocked && timestamp - tank.lastFired > activeWeapon.fireRate) {
        if (tank.fuel >= activeWeapon.fuelCost) {
          tank.fuel -= activeWeapon.fuelCost;
          tank.lastFired = timestamp;

          if (activeWeapon.type === 'laser') {
            sound.playLaser();
            bullets.push({
              id: Math.random().toString(),
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * TANK_RADIUS,
              y: tank.y + Math.sin(tank.angle) * TANK_RADIUS,
              vx: Math.cos(tank.angle) * activeWeapon.speed + tank.vx * 0.3,
              vy: Math.sin(tank.angle) * activeWeapon.speed + tank.vy * 0.3,
              damage: activeWeapon.damage,
              color: activeWeapon.color,
              type: 'laser',
              radius: BULLET_RADIUS,
              createdAt: timestamp
            });
          } else if (activeWeapon.type === 'plasma') {
            sound.playPlasma();
            bullets.push({
              id: Math.random().toString(),
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * TANK_RADIUS,
              y: tank.y + Math.sin(tank.angle) * TANK_RADIUS,
              vx: Math.cos(tank.angle) * activeWeapon.speed,
              vy: Math.sin(tank.angle) * activeWeapon.speed,
              damage: activeWeapon.damage,
              color: activeWeapon.color,
              type: 'plasma',
              radius: BULLET_RADIUS * 2,
              createdAt: timestamp
            });
          } else if (activeWeapon.type === 'spread') {
            sound.playLaser();
            const angles = [-0.2, 0, 0.2];
            angles.forEach((offsetAngle) => {
              const a = tank.angle + offsetAngle;
              bullets.push({
                id: Math.random().toString(),
                ownerId: tank.id,
                x: tank.x + Math.cos(a) * TANK_RADIUS,
                y: tank.y + Math.sin(a) * TANK_RADIUS,
                vx: Math.cos(a) * activeWeapon.speed,
                vy: Math.sin(a) * activeWeapon.speed,
                damage: activeWeapon.damage,
                color: activeWeapon.color,
                type: 'spread',
                radius: BULLET_RADIUS,
                createdAt: timestamp
              });
            });
          } else if (activeWeapon.type === 'seeker') {
            sound.playPlasma();
            bullets.push({
              id: Math.random().toString(),
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * TANK_RADIUS,
              y: tank.y + Math.sin(tank.angle) * TANK_RADIUS,
              vx: Math.cos(tank.angle) * activeWeapon.speed,
              vy: Math.sin(tank.angle) * activeWeapon.speed,
              damage: activeWeapon.damage,
              color: activeWeapon.color,
              type: 'seeker',
              radius: BULLET_RADIUS * 1.5,
              createdAt: timestamp
            });
          } else if (activeWeapon.type === 'bounce') {
            sound.playLaser();
            bullets.push({
              id: Math.random().toString(),
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * TANK_RADIUS,
              y: tank.y + Math.sin(tank.angle) * TANK_RADIUS,
              vx: Math.cos(tank.angle) * activeWeapon.speed,
              vy: Math.sin(tank.angle) * activeWeapon.speed,
              damage: activeWeapon.damage,
              color: activeWeapon.color,
              type: 'bounce',
              radius: BULLET_RADIUS * 1.2,
              bounces: 0,
              maxBounces: 4,
              createdAt: timestamp
            });
          } else if (activeWeapon.type === 'mine') {
            sound.playHit();
            bullets.push({
              id: Math.random().toString(),
              ownerId: tank.id,
              x: tank.x - Math.cos(tank.angle) * TANK_RADIUS * 1.2,
              y: tank.y - Math.sin(tank.angle) * TANK_RADIUS * 1.2,
              vx: 0,
              vy: 0,
              damage: activeWeapon.damage,
              color: activeWeapon.color,
              type: 'mine',
              radius: BULLET_RADIUS * 2,
              lifetime: 20000, // 20s
              createdAt: timestamp
            });
          }
        }
      }
    }
  });

  // 2. Tank vs Tank collisions
  for (let i = 0; i < tanks.length; i++) {
    for (let j = i + 1; j < tanks.length; j++) {
      resolveTankTankCollision(tanks[i], tanks[j]);
    }
  }

  // 3. Update Bullets
  const activeBullets: Bullet[] = [];
  bullets.forEach((bullet) => {
    // Mine checks (does not move, explodes if close to enemy)
    if (bullet.type === 'mine') {
      let exploded = false;
      
      // Check lifetime
      if (bullet.lifetime && timestamp - bullet.createdAt > bullet.lifetime) {
        exploded = true;
      }

      // Check proximity of other tanks
      tanks.forEach((tank) => {
        if (tank.isDead || tank.id === bullet.ownerId) return;
        const dist = Math.sqrt((tank.x - bullet.x) ** 2 + (tank.y - bullet.y) ** 2);
        if (dist < 26) {
          exploded = true;
          // Apply damage
          if (!tank.shieldActive) {
            tank.health = Math.max(0, tank.health - bullet.damage);
            sound.playHit();
            if (tank.health <= 0 && !tank.isDead) {
              tank.isDead = true;
              sound.playExplosion();
              // credit killer
              const killer = tanks.find(t => t.id === bullet.ownerId);
              if (killer) {
                killer.score += 100;
                killer.money += 60;
              }
            }
          }
        }
      });

      if (exploded) {
        sound.playExplosion();
        particleSpawns.push({ x: bullet.x, y: bullet.y, color: '#cc33ff', speed: 4 });
        return; // Remove mine
      }
      activeBullets.push(bullet);
      return;
    }

    // Seeker missile homing logic
    if (bullet.type === 'seeker') {
      let target: Tank | null = null;
      let minDist = Infinity;
      tanks.forEach((tank) => {
        if (tank.isDead || tank.id === bullet.ownerId) return;
        const d = Math.sqrt((tank.x - bullet.x) ** 2 + (tank.y - bullet.y) ** 2);
        if (d < minDist) {
          minDist = d;
          target = tank;
        }
      });

      if (target) {
        const dx = (target as Tank).x - bullet.x;
        const dy = (target as Tank).y - bullet.y;
        const targetAngle = Math.atan2(dy, dx);
        
        let currAngle = Math.atan2(bullet.vy, bullet.vx);
        let diff = targetAngle - currAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const turnRate = 0.04; // radians per frame
        currAngle += clamp(diff, -turnRate, turnRate);

        const speed = 4;
        bullet.vx = Math.cos(currAngle) * speed;
        bullet.vy = Math.sin(currAngle) * speed;
      }
    }

    // Move bullet
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    // Boundary check
    let hitWall = false;
    let normalX = 0;
    let normalY = 0;

    if (bullet.x < 0) { hitWall = true; bullet.x = 0; normalX = 1; }
    if (bullet.x > arena.width) { hitWall = true; bullet.x = arena.width; normalX = -1; }
    if (bullet.y < 0) { hitWall = true; bullet.y = 0; normalY = 1; }
    if (bullet.y > arena.height) { hitWall = true; bullet.y = arena.height; normalY = -1; }

    // Obstacle collisions
    if (!hitWall) {
      for (const obstacle of arena.obstacles) {
        const cx = clamp(bullet.x, obstacle.x, obstacle.x + obstacle.width);
        const cy = clamp(bullet.y, obstacle.y, obstacle.y + obstacle.height);
        const d = Math.sqrt((bullet.x - cx) ** 2 + (bullet.y - cy) ** 2);

        if (d < bullet.radius) {
          hitWall = true;
          // Determine hit normal
          const dl = Math.abs(bullet.x - obstacle.x);
          const dr = Math.abs(bullet.x - (obstacle.x + obstacle.width));
          const dt = Math.abs(bullet.y - obstacle.y);
          const db = Math.abs(bullet.y - (obstacle.y + obstacle.height));
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) normalX = -1;
          else if (m === dr) normalX = 1;
          else if (m === dt) normalY = -1;
          else normalY = 1;
          break;
        }
      }
    }

    if (hitWall) {
      if (bullet.type === 'bounce' && bullet.bounces !== undefined && bullet.maxBounces !== undefined && bullet.bounces < bullet.maxBounces) {
        bullet.bounces++;
        if (normalX !== 0) bullet.vx = -bullet.vx;
        if (normalY !== 0) bullet.vy = -bullet.vy;
        sound.playHit();
        activeBullets.push(bullet);
      } else {
        // Destroy bullet, make small sparks
        particleSpawns.push({ x: bullet.x, y: bullet.y, color: bullet.color, speed: 1.5 });
      }
      return;
    }

    // Bullet vs Tank collision
    let hitTank = false;
    for (const tank of tanks) {
      if (tank.isDead || tank.id === bullet.ownerId) continue;

      const dist = Math.sqrt((tank.x - bullet.x) ** 2 + (tank.y - bullet.y) ** 2);
      if (dist < TANK_RADIUS + bullet.radius) {
        hitTank = true;
        if (!tank.shieldActive) {
          tank.health = Math.max(0, tank.health - bullet.damage);
          sound.playHit();

          if (tank.health <= 0) {
            tank.isDead = true;
            sound.playExplosion();
            particleSpawns.push({ x: tank.x, y: tank.y, color: tank.color, speed: 5 });
            
            // Credit killer
            const killer = tanks.find(t => t.id === bullet.ownerId);
            if (killer) {
              killer.score += 100;
              killer.money += 60;
            }
          } else {
            // Sparks on hit
            particleSpawns.push({ x: bullet.x, y: bullet.y, color: tank.color, speed: 2 });
          }
        } else {
          // Spark on shield
          particleSpawns.push({ x: bullet.x, y: bullet.y, color: '#33ccff', speed: 3 });
        }
        break;
      }
    }

    if (!hitTank) {
      activeBullets.push(bullet);
    }
  });

  return { tanks, bullets: activeBullets, particleSpawns };
}

// Spawn utility
export function arrangeTanksAtSpawns(tanks: Tank[], arena: Arena) {
  const positions = [
    { x: 100, y: 150, angle: 0 },
    { x: arena.width - 100, y: arena.height - 150, angle: Math.PI },
    { x: arena.width - 100, y: 150, angle: Math.PI / 2 },
    { x: 100, y: arena.height - 150, angle: -Math.PI / 2 },
    { x: arena.width / 2, y: 80, angle: Math.PI / 2 },
    { x: arena.width / 2, y: arena.height - 80, angle: -Math.PI / 2 },
  ];

  tanks.forEach((tank, idx) => {
    const pos = positions[idx % positions.length];
    tank.x = pos.x;
    tank.y = pos.y;
    tank.vx = 0;
    tank.vy = 0;
    tank.angle = pos.angle;
    tank.health = tank.maxHealth;
    tank.fuel = tank.maxFuel;
    tank.isDead = false;
    tank.shieldActive = false;
  });
}
