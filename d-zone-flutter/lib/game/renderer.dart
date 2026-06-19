import 'dart:math';
import 'package:flutter/material.dart';
import 'models.dart';
import 'engine.dart';

class GamePainter extends CustomPainter {
  final List<Tank> tanks;
  final List<Bullet> bullets;
  final Arena arena;
  final int timestampMs;

  GamePainter({
    required this.tanks,
    required this.bullets,
    required this.arena,
    required this.timestampMs,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Clear background
    final bgPaint = Paint()..color = const Color(0xFF0A0A14);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    // 2. Draw retro neon grid lines
    final gridPaint = Paint()
      ..color = const Color(0xFF003264).withOpacity(0.15)
      ..strokeWidth = 1.0;
    
    const gridSize = 40.0;
    for (double y = 0; y < size.height; y += gridSize) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
    for (double x = 0; x < size.width; x += gridSize) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }

    // 3. Draw Charging Zones (Corner lights)
    for (var zone in arena.chargingZones) {
      final pulse = 1.0 + sin(timestampMs * 0.005) * 0.08;
      final radius = zone.radius * pulse;

      // Glow radial gradient
      final glowPaint = Paint()
        ..shader = RadialGradient(
          colors: [
            const Color(0x6600FFFF),
            const Color(0x1A00FFFF),
            Colors.transparent,
          ],
        ).createShader(Rect.fromCircle(center: Offset(zone.x, zone.y), radius: radius));

      canvas.drawCircle(Offset(zone.x, zone.y), radius, glowPaint);

      // Rings
      final ringPaint = Paint()
        ..color = const Color(0x9900FFFF)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;
      
      canvas.drawCircle(Offset(zone.x, zone.y), zone.radius - 8, ringPaint);

      final centerPaint = Paint()..color = Colors.white;
      canvas.drawCircle(Offset(zone.x, zone.y), 4.0, centerPaint);
    }

    // 4. Draw Obstacles (Hatched dark rects with neon orange borders)
    for (var obstacle in arena.obstacles) {
      final rect = Rect.fromLTWH(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Dark fill
      final obsFillPaint = Paint()..color = const Color(0xFF0F1124);
      canvas.drawRect(rect, obsFillPaint);

      // Hatching lines
      final hatchPaint = Paint()
        ..color = const Color(0x1F0096FF)
        ..strokeWidth = 1.5;
      
      const spacing = 12.0;
      canvas.save();
      canvas.clipRect(rect);
      for (double offset = -obstacle.height; offset < obstacle.width; offset += spacing) {
        canvas.drawLine(
          Offset(obstacle.x + max(0, offset), obstacle.y + max(0, -offset)),
          Offset(
            obstacle.x + min(obstacle.width, obstacle.width + offset),
            obstacle.y + min(obstacle.height, -offset + obstacle.width),
          ),
          hatchPaint,
        );
      }
      canvas.restore();

      // Neon border
      final obsBorderPaint = Paint()
        ..color = const Color(0xFFFF6600)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;
      canvas.drawRect(rect, obsBorderPaint);
    }

    // 5. Draw Bullets
    for (var bullet in bullets) {
      final bPaint = Paint()..color = bullet.color;

      if (bullet.type == 'mine') {
        final isBlinking = (timestampMs ~/ 200) % 2 == 0;
        final mineBorderPaint = Paint()
          ..color = bullet.color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0;
        canvas.drawCircle(Offset(bullet.x, bullet.y), bullet.radius, mineBorderPaint);

        final mineFillPaint = Paint()
          ..color = isBlinking ? Colors.white : const Color(0x80CC33FF);
        canvas.drawCircle(Offset(bullet.x, bullet.y), bullet.radius - 4, mineFillPaint);
      } else if (bullet.type == 'laser' || bullet.type == 'spread') {
        final angle = atan2(bullet.vy, bullet.vx);
        final trailPaint = Paint()
          ..color = bullet.color
          ..strokeWidth = 2.5;
        canvas.drawLine(
          Offset(bullet.x, bullet.y),
          Offset(bullet.x - cos(angle) * 16, bullet.y - sin(angle) * 16),
          trailPaint,
        );
      } else if (bullet.type == 'bounce') {
        canvas.save();
        canvas.translate(bullet.x, bullet.y);
        canvas.rotate((timestampMs / 80) % (pi * 2));
        final discPaint = Paint()
          ..color = bullet.color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0;
        canvas.drawCircle(Offset.zero, bullet.radius, discPaint);
        canvas.drawLine(Offset(-bullet.radius, 0), Offset(bullet.radius, 0), discPaint);
        canvas.drawLine(Offset(0, -bullet.radius), Offset(0, bullet.radius), discPaint);
        canvas.restore();
      } else if (bullet.type == 'seeker') {
        canvas.save();
        canvas.translate(bullet.x, bullet.y);
        canvas.rotate(atan2(bullet.vy, bullet.vx));
        
        final rocketPath = Path()
          ..moveTo(bullet.radius * 2, 0)
          ..lineTo(-bullet.radius, -bullet.radius)
          ..lineTo(-bullet.radius, bullet.radius)
          ..close();
        canvas.drawPath(rocketPath, bPaint);
        canvas.restore();
      } else {
        canvas.drawCircle(Offset(bullet.x, bullet.y), bullet.radius, bPaint);
        final corePaint = Paint()..color = Colors.white;
        canvas.drawCircle(Offset(bullet.x, bullet.y), bullet.radius / 2.0, corePaint);
      }
    }

    // 6. Draw Tanks
    for (var tank in tanks) {
      if (tank.isDead) continue;

      canvas.save();
      canvas.translate(tank.x, tank.y);
      canvas.rotate(tank.angle);

      final tankPaint = Paint()
        ..color = tank.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5;
      
      final fillPaint = Paint()..color = const Color(0xCC0A0A14);

      final path = Path()
        ..moveTo(tankRadius, 0)
        ..lineTo(-tankRadius + 4.0, -tankRadius + 5.0)
        ..lineTo(-tankRadius + 8.0, 0)
        ..lineTo(-tankRadius + 4.0, tankRadius - 5.0)
        ..close();

      canvas.drawPath(path, fillPaint);
      canvas.drawPath(path, tankPaint);

      // Fuel Gauges ( cylinders )
      final fuelPct = tank.fuel / tank.maxFuel;
      final fuelColor = tank.fuel < 30 ? const Color(0xFFFF0000) : tank.color;
      final fuelPaint = Paint()..color = fuelColor;

      canvas.drawRect(Rect.fromLTWH(-12, -7, 10 * fuelPct, 5), fuelPaint);
      canvas.drawRect(Rect.fromLTWH(-12, 2, 10 * fuelPct, 5), fuelPaint);

      // Turret lines
      final turretPaint = Paint()
        ..color = Colors.white;
      canvas.drawLine(const Offset(2, 0), const Offset(tankRadius + 3, 0), turretPaint);

      canvas.restore();

      // Energy Shield
      if (tank.shieldActive) {
        canvas.save();
        canvas.translate(tank.x, tank.y);
        canvas.rotate((timestampMs / 150) % (pi * 2));
        final shieldPaint = Paint()
          ..color = const Color(0xFF33CCFF)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5;
        
        // Dotted circle approximation using arcs in Dart
        for (int i = 0; i < 8; i++) {
          canvas.drawArc(
            Rect.fromCircle(center: Offset.zero, radius: tankRadius + 10.0),
            (i * pi / 4),
            pi / 8,
            false,
            shieldPaint,
          );
        }
        canvas.restore();
      }

      // floating vitals above tank
      final barWidth = 36.0;
      final healthPct = tank.health / tank.maxHealth;
      final healthColor = healthPct > 0.6 ? const Color(0xFF33FF33) : healthPct > 0.3 ? const Color(0xFFFFCC00) : const Color(0xFFFF3333);
      
      final barRectBg = Rect.fromLTWH(tank.x - barWidth / 2, tank.y - tankRadius - 16, barWidth, 4);
      final barRectFill = Rect.fromLTWH(tank.x - barWidth / 2, tank.y - tankRadius - 16, barWidth * healthPct, 4);

      canvas.drawRect(barRectBg, Paint()..color = Colors.black.withOpacity(0.5));
      canvas.drawRect(barRectFill, Paint()..color = healthColor);

      // Render floating Text name (using simple Text Painter)
      final tp = TextPainter(
        text: TextSpan(
          text: tank.name,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 9.0,
            fontFamily: 'Courier',
            fontWeight: FontWeight.bold,
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      tp.layout();
      tp.paint(canvas, Offset(tank.x - tp.width / 2, tank.y - tankRadius - 28));
    }
  }

  @override
  bool shouldRepaint(covariant GamePainter oldDelegate) {
    return true; // Simple frame-by-frame updates
  }
}
