import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../game/game_state.dart';
import '../game/models.dart';

class GameHudWidget extends StatefulWidget {
  final VoidCallback onQuit;

  const GameHudWidget({Key? key, required this.onQuit}) : super(key: key);

  @override
  State<GameHudWidget> createState() => _GameHudWidgetState();
}

class _ShopTouchPos {
  double dx;
  double dy;
  _ShopTouchPos(this.dx, this.dy);
}

class _GameHudWidgetState extends State<GameHudWidget> {
  Offset _joystickOffset = Offset.zero;
  final double _joystickMaxRadius = 45.0;

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<GameStateProvider>(context);
    final tanks = state.tanks;
    final roundNum = state.roundNum;
    final timeLeft = state.timeLeft;
    final settings = state.settings;

    final humanTanks = tanks.where((t) => !t.isRobot).toList().sublist(0, settings.humanPlayers);
    final aliveRobots = tanks.where((t) => t.isRobot && !t.isDead).length;

    // Detect if we should render mobile virtual controls.
    // Screen width < 800 or touch-primary devices are good candidates.
    final renderMobileControls = MediaQuery.of(context).size.width < 950;

    return Stack(
      children: [
        // 1. Top bar: Info and abort button
        Positioned(
          top: 10,
          left: 15,
          right: 15,
          child: IgnorePointer(
            ignoring: false,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xDA0A0A14),
                border: Border.all(color: const Color(0xFF005577), width: 1.5),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _infoBox('ROUND', '$roundNum', const Color(0xFFFF6600)),
                  _infoBox(
                    'TIME REMAINING',
                    '${timeLeft ~/ 60}:${(timeLeft % 60) < 10 ? '0' : ''}${timeLeft % 60}',
                    timeLeft < 15 ? const Color(0xFFFF3366) : const Color(0xFF00FFFF),
                  ),
                  _infoBox('ROBOTS ALIVE', '$aliveRobots', const Color(0xFF33FF33)),
                  SizedBox(
                    height: 28,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFFF3366)),
                        backgroundColor: const Color(0x33FF3366),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                      onPressed: widget.onQuit,
                      child: const Text('ABORT COMBAT', style: TextStyle(color: Color(0xFFFF3366), fontFamily: 'Courier', fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // 2. Mobile Joystick & Action Buttons Overlay
        if (renderMobileControls && humanTanks.isNotEmpty && !humanTanks[0].isDead) ...[
          // Virtual Joystick (Bottom Left)
          Positioned(
            bottom: 120,
            left: 30,
            child: GestureDetector(
              onPanStart: (details) => _updateJoystick(details.localPosition),
              onPanUpdate: (details) => _updateJoystick(details.localPosition),
              onPanEnd: (_) => _resetJoystick(),
              child: Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.4),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF00FFFF).withOpacity(0.4), width: 2),
                ),
                child: Center(
                  child: Transform.translate(
                    offset: _joystickOffset,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Color(0xFF00FFFF),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: Color(0xFF00FFFF), blurRadius: 8),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Action Buttons (Bottom Right)
          Positioned(
            bottom: 110,
            right: 30,
            child: Row(
              children: [
                // Cycle Weapon
                GestureDetector(
                  onTapDown: (_) => state.cycleWeapon('p1'),
                  child: _actionCircle('WEAP', const Color(0xFFFF9900)),
                ),
                const SizedBox(width: 14),
                // Tool Button
                GestureDetector(
                  onTapDown: (_) => state.setVirtualButtons(false, true),
                  onTapUp: (_) => state.setVirtualButtons(false, false),
                  onTapCancel: () => state.setVirtualButtons(false, false),
                  child: _actionCircle('TOOL', const Color(0xFFCC33FF)),
                ),
                const SizedBox(width: 14),
                // Fire Button
                GestureDetector(
                  onTapDown: (_) => state.setVirtualButtons(true, false),
                  onTapUp: (_) => state.setVirtualButtons(false, false),
                  onTapCancel: () => state.setVirtualButtons(false, false),
                  child: _actionCircle('FIRE', const Color(0xFFFF3366), large: true),
                ),
              ],
            ),
          ),
        ],

        // 3. Bottom bar: Player vital dashboards
        Positioned(
          bottom: 10,
          left: 15,
          right: 15,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: humanTanks.map((tank) {
              final activeWeapon = tank.weapons[tank.activeWeaponIndex];
              final activeTool = tank.tools.firstWhere((t) => t.unlocked, orElse: () => tank.tools[0]);
              final hasTool = tank.tools.any((t) => t.unlocked);

              final healthPct = tank.health / tank.maxHealth;
              final fuelPct = tank.fuel / tank.maxFuel;

              return Expanded(
                child: Container(
                  maxHeight: 90,
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xEA0A0A14),
                    border: Border.all(color: tank.color, width: 2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: tank.isDead
                      ? const Center(child: Text('TANK DESTROYED', style: TextStyle(color: Color(0xFFFF3333), fontFamily: 'Courier', fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 2)))
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(tank.name, style: TextStyle(color: tank.color, fontFamily: 'Courier', fontSize: 12, fontWeight: FontWeight.bold)),
                                Text('SCORE: ${tank.score} | \$${tank.money}', style: const TextStyle(color: Colors.white, fontFamily: 'Courier', fontSize: 9)),
                              ],
                            ),
                            const SizedBox(height: 5),

                            // Health bar
                            Row(
                              children: [
                                const SizedBox(width: 45, child: Text('ARMOR:', style: TextStyle(color: Color(0xFF88CCFF), fontFamily: 'Courier', fontSize: 9))),
                                Expanded(
                                  child: Container(
                                    height: 6,
                                    color: Colors.white10,
                                    alignment: Alignment.centerLeft,
                                    child: FractionallySizedBox(
                                      widthFactor: healthPct,
                                      child: Container(color: const Color(0xFF33FF33)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text('${tank.health.round()}/${tank.maxHealth.round()}', style: const TextStyle(color: Colors.white, fontFamily: 'Courier', fontSize: 8)),
                              ],
                            ),
                            const SizedBox(height: 4),

                            // Fuel bar
                            Row(
                              children: [
                                const SizedBox(width: 45, child: Text('FUEL:', style: TextStyle(color: Color(0xFF88CCFF), fontFamily: 'Courier', fontSize: 9))),
                                Expanded(
                                  child: Container(
                                    height: 6,
                                    color: Colors.white10,
                                    alignment: Alignment.centerLeft,
                                    child: FractionallySizedBox(
                                      widthFactor: fuelPct,
                                      child: Container(color: tank.color),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text('${tank.fuel.round()}/${tank.maxFuel.round()}', style: const TextStyle(color: Colors.white, fontFamily: 'Courier', fontSize: 8)),
                              ],
                            ),
                            const SizedBox(height: 4),

                            // Weapon info
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('WEAPON: ${activeWeapon.name}', style: TextStyle(color: activeWeapon.color, fontFamily: 'Courier', fontSize: 8, fontWeight: FontWeight.bold)),
                                Text('AUX: ${hasTool ? activeTool.name : "NONE"}', style: const TextStyle(color: Color(0xFFFF33FF), fontFamily: 'Courier', fontSize: 8)),
                              ],
                            ),
                          ],
                        ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _infoBox(String label, String value, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF88CCFF), fontSize: 9, fontFamily: 'Courier')),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontFamily: 'Courier',
            fontWeight: FontWeight.bold,
            shadows: [
              Shadow(color: color.withOpacity(0.5), blurRadius: 4),
            ],
          ),
        ),
      ],
    );
  }

  Widget _actionCircle(String label, Color color, {bool large = false}) {
    final size = large ? 56.0 : 45.0;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.25),
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 2),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.15), blurRadius: 6),
        ],
      ),
      child: Center(
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontFamily: 'Courier',
            fontWeight: FontWeight.bold,
            fontSize: large ? 12 : 9,
          ),
        ),
      ),
    );
  }

  void _updateJoystick(Offset localPos) {
    final state = Provider.of<GameStateProvider>(context, listen: false);
    final center = const Offset(55.0, 55.0);
    final diff = localPos - center;
    final dist = diff.distance;

    if (dist < _joystickMaxRadius) {
      setState(() {
        _joystickOffset = diff;
      });
    } else {
      setState(() {
        _joystickOffset = Offset.fromDirection(diff.direction, _joystickMaxRadius);
      });
    }

    // Pass normalized x and y inputs to game state
    state.setJoystickInput(
      _joystickOffset.dx / _joystickMaxRadius,
      _joystickOffset.dy / _joystickMaxRadius,
    );
  }

  void _resetJoystick() {
    final state = Provider.of<GameStateProvider>(context, listen: false);
    setState(() {
      _joystickOffset = Offset.zero;
    });
    state.setJoystickInput(0.0, 0.0);
  }
}
