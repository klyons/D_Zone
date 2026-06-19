import { Tank, Bullet, Arena, RectObstacle } from './types';
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

    // 3. Render Obstacles (Vector style with hatch pattern)
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

    // 4. Render Bullets
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

    // 5. Render Particles
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

    // 6. Render Tanks (Triangle vector shape with fuel cylinders)
    tanks.forEach((tank) => {
      if (tank.isDead) return;

      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);

      // Base vector tank design (isosceles triangle)
      const color = tank.color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      
      // Draw outer hull
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(TANK_RADIUS, 0); // Nose
      ctx.lineTo(-TANK_RADIUS + 4, -TANK_RADIUS + 5); // Back left
      ctx.lineTo(-TANK_RADIUS + 8, 0); // Back indent
      ctx.lineTo(-TANK_RADIUS + 4, TANK_RADIUS - 5); // Back right
      ctx.closePath();
      ctx.stroke();

      // Highlight core
      ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
      ctx.fill();

      // Render interior fuel cylinders (glowing lines/boxes on the back)
      // Visual indicator of weapon fuel! (Glowing colored radioactive liquid)
      const fuelPct = tank.fuel / tank.maxFuel;
      const fuelColor = tank.fuel < 30 ? '#ff0000' : color;
      ctx.fillStyle = fuelColor;
      ctx.shadowColor = fuelColor;
      ctx.shadowBlur = 6;
      
      // Draw 2 cylinder bars on the back
      const barH = 5;
      const barW = 10 * fuelPct;
      ctx.fillRect(-12, -7, barW, barH);
      ctx.fillRect(-12, 2, barW, barH);

      // Draw tank turret pointer
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(TANK_RADIUS + 3, 0);
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
