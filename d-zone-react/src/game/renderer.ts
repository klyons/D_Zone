import { Tank, Bullet, Arena, ArenaFeature, RectObstacle } from './types';
import { TANK_RADIUS, BULLET_RADIUS } from './engine';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  addExplosionParticles(x: number, y: number, color: string, count = 25) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.02
      });
    }
  }

  addThrusterParticles(x: number, y: number, angle: number, color: string) {
    // Spawn thrust spark opposite to tank angle
    const thrustAngle = angle + Math.PI + (Math.random() * 0.4 - 0.2);
    const speed = 1 + Math.random() * 2;
    this.particles.push({
      x: x - Math.cos(angle) * TANK_RADIUS,
      y: y - Math.sin(angle) * TANK_RADIUS,
      vx: Math.cos(thrustAngle) * speed,
      vy: Math.sin(thrustAngle) * speed,
      color,
      size: 1.5 + Math.random() * 2,
      alpha: 0.8,
      decay: 0.04
    });
  }

  addChargeParticles(tankX: number, tankY: number, zoneX: number, zoneY: number, color: string) {
    // Particles floating from zone to tank
    const dx = tankX - zoneX;
    const dy = tankY - zoneY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Spawn at zone
    const spawnAngle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 20;
    const px = zoneX + Math.cos(spawnAngle) * radius;
    const py = zoneY + Math.sin(spawnAngle) * radius;

    // Direct velocity towards tank
    const speed = 2 + Math.random() * 2;
    const angle = Math.atan2(tankY - py, tankX - px);

    this.particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 1 + Math.random() * 1.5,
      alpha: 0.7,
      decay: 0.02
    });
  }

  updateParticles() {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      return p.alpha > 0;
    });
  }

  render(tanks: Tank[], bullets: Bullet[], arena: Arena, timestamp: number) {
    const ctx = this.ctx;
    const w = arena.width;
    const h = arena.height;

    // 1. Clear background & draw CRT retro grid
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, w, h);

    // Draw glowing neon blue grid lines
    ctx.strokeStyle = 'rgba(0, 50, 100, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    // Horizontal lines
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Vertical lines
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // 2. Render Charging Zones (Neon Light Corners)
    arena.chargingZones.forEach((zone) => {
      const pulse = 1 + Math.sin(timestamp * 0.005) * 0.08;
      const radius = zone.radius * pulse;

      // Outer glow
      const grad = ctx.createRadialGradient(zone.x, zone.y, 2, zone.x, zone.y, radius);
      grad.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
      grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
      grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner rings
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius - 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(zone.x, zone.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Clear shadow
      ctx.shadowBlur = 0;
    });

    // 3. Render Arena Features
    if (arena.features) {
      arena.features.forEach((feature) => {
        if (feature.type === 'hazard') {
          const pulse = 0.8 + Math.sin(timestamp * 0.003) * 0.2;
          if (feature.width !== undefined && feature.height !== undefined) {
            // Rect hazard - lava pool
            const grad = ctx.createLinearGradient(feature.x, feature.y, feature.x, feature.y + feature.height);
            const a = 0.5 * pulse;
            grad.addColorStop(0, `rgba(255, 60, 0, ${a})`);
            grad.addColorStop(0.5, `rgba(255, 150, 0, ${a * 0.6})`);
            grad.addColorStop(1, `rgba(200, 30, 0, ${a * 0.3})`);
            ctx.fillStyle = grad;
            ctx.fillRect(feature.x, feature.y, feature.width, feature.height);
            // Border glow
            ctx.strokeStyle = `rgba(255, 80, 0, ${0.6 * pulse})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 15;
            ctx.strokeRect(feature.x, feature.y, feature.width, feature.height);
            ctx.shadowBlur = 0;
            // Surface bubbles
            if (Math.random() < 0.3) {
              ctx.fillStyle = `rgba(255, 200, 50, ${0.4 + Math.random() * 0.3})`;
              ctx.beginPath();
              ctx.arc(
                feature.x + Math.random() * feature.width,
                feature.y + Math.random() * feature.height,
                1 + Math.random() * 3,
                0, Math.PI * 2
              );
              ctx.fill();
            }
          } else if (feature.radius !== undefined) {
            // Circular hazard
            const grad = ctx.createRadialGradient(feature.x, feature.y, 2, feature.x, feature.y, feature.radius);
            const a = 0.45 * pulse;
            grad.addColorStop(0, `rgba(255, 100, 0, ${a})`);
            grad.addColorStop(0.5, `rgba(255, 60, 0, ${a * 0.5})`);
            grad.addColorStop(1, `rgba(200, 20, 0, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(feature.x, feature.y, feature.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 80, 0, ${0.5 * pulse})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(feature.x, feature.y, feature.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        } else if (feature.type === 'speedBoost') {
          if (feature.width !== undefined && feature.height !== undefined) {
            ctx.save();
            // Glowing speed lanes
            const pulse = 0.6 + Math.sin(timestamp * 0.004) * 0.2;
            const grad = ctx.createLinearGradient(feature.x, feature.y, feature.x + feature.width, feature.y + feature.height);
            grad.addColorStop(0, `rgba(0, 255, 120, ${pulse * 0.15})`);
            grad.addColorStop(0.3, `rgba(0, 255, 200, ${pulse * 0.25})`);
            grad.addColorStop(0.5, `rgba(0, 255, 255, ${pulse * 0.3})`);
            grad.addColorStop(0.7, `rgba(0, 255, 200, ${pulse * 0.25})`);
            grad.addColorStop(1, `rgba(0, 255, 120, ${pulse * 0.15})`);
            ctx.fillStyle = grad;
            ctx.fillRect(feature.x, feature.y, feature.width, feature.height);
            // Directional chevron arrows
            ctx.strokeStyle = `rgba(0, 255, 200, ${pulse * 0.4})`;
            ctx.lineWidth = 1.5;
            const arrowSize = 10;
            const spacing = 80;
            const isHorizontal = feature.width > feature.height;
            const mainAxis = isHorizontal ? feature.width : feature.height;
            const offset = (timestamp * 0.05) % spacing;
            for (let i = -spacing + offset; i < mainAxis + spacing; i += spacing) {
              const cx = isHorizontal ? feature.x + i : feature.x + feature.width / 2;
              const cy = isHorizontal ? feature.y + feature.height / 2 : feature.y + i;
              ctx.beginPath();
              if (isHorizontal) {
                ctx.moveTo(cx + arrowSize, cy);
                ctx.lineTo(cx - arrowSize * 0.5, cy - arrowSize * 0.5);
                ctx.moveTo(cx + arrowSize, cy);
                ctx.lineTo(cx - arrowSize * 0.5, cy + arrowSize * 0.5);
              } else {
                ctx.moveTo(cx, cy + arrowSize);
                ctx.lineTo(cx - arrowSize * 0.5, cy - arrowSize * 0.5);
                ctx.moveTo(cx, cy + arrowSize);
                ctx.lineTo(cx + arrowSize * 0.5, cy - arrowSize * 0.5);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        } else if (feature.type === 'gravityWell') {
          if (feature.radius !== undefined) {
            const pulse = 0.5 + Math.sin(timestamp * 0.002) * 0.2;
            // Outer glow
            const grad = ctx.createRadialGradient(feature.x, feature.y, 5, feature.x, feature.y, feature.radius);
            grad.addColorStop(0, `rgba(180, 0, 255, ${pulse * 0.4})`);
            grad.addColorStop(0.3, `rgba(120, 0, 200, ${pulse * 0.2})`);
            grad.addColorStop(0.6, `rgba(80, 0, 150, ${pulse * 0.1})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(feature.x, feature.y, feature.radius, 0, Math.PI * 2);
            ctx.fill();
            // Spiral arms
            ctx.save();
            ctx.translate(feature.x, feature.y);
            ctx.rotate(timestamp * 0.001);
            for (let i = 0; i < 3; i++) {
              const armAngle = (i / 3) * Math.PI * 2;
              ctx.strokeStyle = `rgba(200, 100, 255, ${pulse * 0.3})`;
              ctx.lineWidth = 3;
              ctx.shadowColor = '#aa33ff';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              for (let r = 5; r < feature.radius; r += 4) {
                const a = armAngle + r * 0.02;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
              }
              ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
            // Center core
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#cc66ff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(feature.x, feature.y, 6 + 3 * Math.sin(timestamp * 0.005), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else if (feature.type === 'teleportPad') {
          if (feature.radius !== undefined) {
            const pulse = 0.6 + Math.sin(timestamp * 0.006) * 0.2;
            // Portal ring
            ctx.save();
            ctx.translate(feature.x, feature.y);
            ctx.rotate(timestamp * 0.002);
            ctx.strokeStyle = `rgba(0, 200, 255, ${pulse * 0.7})`;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, feature.radius, 0, Math.PI * 2);
            ctx.stroke();
            // Inner ring
            ctx.strokeStyle = `rgba(0, 255, 200, ${pulse * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, feature.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            // Center glow
            ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.2})`;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, feature.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
          }
        }
      });
    }

    // 5. Render Obstacles (Vector style with hatch pattern)
    arena.obstacles.forEach((obstacle) => {
      // Draw dark fill
      ctx.fillStyle = '#0f1124';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Hatching lines (diagonal vector lines inside blocks)
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const spacing = 12;
      for (let offset = -obstacle.height; offset < obstacle.width; offset += spacing) {
        ctx.moveTo(obstacle.x + Math.max(0, offset), obstacle.y + Math.max(0, -offset));
        ctx.lineTo(
          obstacle.x + Math.min(obstacle.width, obstacle.width + offset),
          obstacle.y + Math.min(obstacle.height, -offset + obstacle.width)
        );
      }
      ctx.stroke();

      // Neon orange border
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 6;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.shadowBlur = 0;
    });

    // 6. Render Bullets
    bullets.forEach((bullet) => {
      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = 8;

      if (bullet.type === 'mine') {
        // Blinking mine
        const isBlinking = Math.floor(timestamp / 200) % 2 === 0;
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isBlinking ? '#ffffff' : 'rgba(204, 51, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius - 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (bullet.type === 'laser' || bullet.type === 'spread') {
        // Laser trail line
        const angle = Math.atan2(bullet.vy, bullet.vx);
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x - Math.cos(angle) * 16, bullet.y - Math.sin(angle) * 16);
        ctx.stroke();
      } else if (bullet.type === 'bounce') {
        // Rotating disc
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate((timestamp / 80) % (Math.PI * 2));
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner cross
        ctx.beginPath();
        ctx.moveTo(-bullet.radius, 0); ctx.lineTo(bullet.radius, 0);
        ctx.moveTo(0, -bullet.radius); ctx.lineTo(0, bullet.radius);
        ctx.stroke();
        ctx.restore();
      } else if (bullet.type === 'seeker') {
        // Seeker rocket shape
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
        
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.moveTo(bullet.radius * 2, 0);
        ctx.lineTo(-bullet.radius, -bullet.radius);
        ctx.lineTo(-bullet.radius, bullet.radius);
        ctx.closePath();
        ctx.fill();
        
        // Exhaust fire
        if (Math.random() < 0.6) {
          ctx.fillStyle = '#ff3300';
          ctx.beginPath();
          ctx.arc(-bullet.radius - 3, 0, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // Plasma circle
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    });

    // 7. Render Particles
    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.shadowBlur = 0;

    // 8. Render Tanks (Triangle vector shape with fuel cylinders)
    tanks.forEach((tank) => {
      if (tank.isDead) return;

      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);

      // Base vector tank design differentiated by type (Scout, Assault, Dreadnought)
      const color = tank.color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      
      // Base size scaling for drawing
      let r = TANK_RADIUS;
      if (tank.type === 'scout') r = TANK_RADIUS * 0.85;
      else if (tank.type === 'dreadnought') r = TANK_RADIUS * 1.25;

      // Draw outer hull
      ctx.strokeStyle = color;
      ctx.lineWidth = tank.type === 'dreadnought' ? 3.5 : 2.5; // Thicker lines for dreadnought
      ctx.beginPath();

      if (tank.type === 'scout') {
        // Sleek needle nose with swept back wings
        ctx.moveTo(r + 3, 0); // Extended nose
        ctx.lineTo(-r + 1, -r + 2); // Left wing tip
        ctx.lineTo(-r + 6, -2); // Left inner indent
        ctx.lineTo(-r + 6, 2); // Right inner indent
        ctx.lineTo(-r + 1, r - 2); // Right wing tip
      } else if (tank.type === 'dreadnought') {
        // Bulky, armored octagon battleship shape
        ctx.moveTo(r, -4); // Flat nose top
        ctx.lineTo(r, 4); // Flat nose bottom
        ctx.lineTo(r - 6, r); // Heavy front shoulder
        ctx.lineTo(-r + 2, r); // Heavy side
        ctx.lineTo(-r + 2, -r); // Heavy back corner
        ctx.lineTo(r - 6, -r); // Heavy front shoulder
      } else {
        // Assault: Classic balanced delta wing with back indent
        ctx.moveTo(r, 0); // Nose
        ctx.lineTo(-r + 4, -r + 5); // Back left
        ctx.lineTo(-r + 8, 0); // Back indent
        ctx.lineTo(-r + 4, r - 5); // Back right
      }
      ctx.closePath();
      ctx.stroke();

      // Highlight core
      ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
      ctx.fill();

      // Draw class-specific internal detail lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      if (tank.type === 'scout') {
        // Sleek spine line
        ctx.moveTo(-r + 8, 0);
        ctx.lineTo(r - 2, 0);
      } else if (tank.type === 'dreadnought') {
        // Armor plating division lines
        ctx.moveTo(-r + 6, -r + 4);
        ctx.lineTo(r - 10, 0);
        ctx.lineTo(-r + 6, r - 4);
        ctx.moveTo(-r + 6, 0);
        ctx.lineTo(r - 6, 0);
      } else {
        // Assault: Cockpit lines
        ctx.moveTo(-r + 8, -3);
        ctx.lineTo(r - 6, 0);
        ctx.lineTo(-r + 8, 3);
      }
      ctx.stroke();

      // Render interior fuel cylinders (glowing lines/boxes on the back)
      const fuelPct = tank.fuel / tank.maxFuel;
      const fuelColor = tank.fuel < 30 ? '#ff0000' : color;
      ctx.fillStyle = fuelColor;
      ctx.shadowColor = fuelColor;
      ctx.shadowBlur = 6;
      
      if (tank.type === 'scout') {
        // Scout: Single central sleek fuel core
        const barH = 3;
        const barW = 12 * fuelPct;
        ctx.fillRect(-12, -1.5, barW, barH);
      } else if (tank.type === 'dreadnought') {
        // Dreadnought: Massive triple energy reactor blocks
        const barH = 4;
        const barW = 8 * fuelPct;
        ctx.fillRect(-r + 4, -8, barW, barH);
        ctx.fillRect(-r + 4, -2, barW, barH);
        ctx.fillRect(-r + 4, 4, barW, barH);
      } else {
        // Assault: Classic double cylinders
        const barH = 5;
        const barW = 10 * fuelPct;
        ctx.fillRect(-12, -7, barW, barH);
        ctx.fillRect(-12, 2, barW, barH);
      }

      // Draw tank turret pointer
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = tank.type === 'dreadnought' ? 2.5 : 1.5; // Thicker turret for dreadnought
      ctx.beginPath();
      if (tank.type === 'dreadnought') {
        // Twin-barrel look for Dreadnought!
        ctx.moveTo(2, -3);
        ctx.lineTo(r + 3, -3);
        ctx.moveTo(2, 3);
        ctx.lineTo(r + 3, 3);
      } else if (tank.type === 'scout') {
        // Sleek single antenna pointer
        ctx.moveTo(2, 0);
        ctx.lineTo(r + 5, 0);
      } else {
        // Standard single turret pointer
        ctx.moveTo(2, 0);
        ctx.lineTo(r + 3, 0);
      }
      ctx.stroke();

      ctx.restore();
      ctx.shadowBlur = 0;

      // Draw floating shield if active
      if (tank.shieldActive) {
        ctx.save();
        ctx.translate(tank.x, tank.y);
        ctx.strokeStyle = '#33ccff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#33ccff';
        ctx.shadowBlur = 12;
        
        // Rotating dotted circle shield
        ctx.rotate((timestamp / 150) % (Math.PI * 2));
        ctx.beginPath();
        ctx.arc(0, 0, TANK_RADIUS + 10, 0, Math.PI * 2);
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        
        ctx.restore();
        ctx.shadowBlur = 0;
      }

      // Draw Player HUD details floating above
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      
      // Health bar
      const barWidth = 36;
      const healthPct = tank.health / tank.maxHealth;
      const healthColor = healthPct > 0.6 ? '#33ff33' : healthPct > 0.3 ? '#ffff33' : '#ff3333';
      
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(tank.x - barWidth / 2, tank.y - TANK_RADIUS - 16, barWidth, 4);
      ctx.fillStyle = healthColor;
      ctx.fillRect(tank.x - barWidth / 2, tank.y - TANK_RADIUS - 16, barWidth * healthPct, 4);

      // Team badge
      if (tank.team) {
        const teamColor = tank.team === 'alpha' ? '#00ffff' : '#ff3366';
        ctx.fillStyle = teamColor;
        ctx.shadowColor = teamColor;
        ctx.shadowBlur = 6;
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`[${tank.team.toUpperCase()}]`, tank.x - 16, tank.y - TANK_RADIUS - 28);
        ctx.shadowBlur = 0;
      }

      // Text name
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tank.name, tank.x, tank.y - TANK_RADIUS - 22);

      // Selected weapon overlay if human player
      if (!tank.isRobot) {
        const weapon = tank.weapons[tank.activeWeaponIndex];
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '8px monospace';
        ctx.fillText(weapon.name, tank.x, tank.y + TANK_RADIUS + 14);
      }
    });

    // Particle updater tick
    this.updateParticles();
  }
}
