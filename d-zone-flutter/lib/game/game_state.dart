import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'models.dart';
import 'constants.dart';
import 'engine.dart';

class GameStateProvider extends ChangeNotifier {
  String _currentState = 'menu'; // menu, playing, round_over, shop, game_over
  GameSettings settings = GameSettings();
  int roundNum = 1;
  int timeLeft = 90;
  Tank? roundWinner;

  List<Tank> tanks = [];
  List<Bullet> bullets = [];
  final Map<LogicalKeyboardKey, bool> keysPressed = {};
  
  // Joystick inputs (for mobile virtual joystick)
  double p1JoystickX = 0;
  double p1JoystickY = 0;
  bool p1VirtualFire = false;
  bool p1VirtualTool = false;

  Timer? _timer;
  
  String get currentState => _currentState;

  void updateState(String newState) {
    _currentState = newState;
    notifyListeners();
  }

  void initGame() {
    // Human Player 1
    final players = [
      createDefaultTank('p1', 'PLAYER 1', TankType.assault, const Color(0xFF00FFFF), isRobot: false)
    ];

    // Local Multiplayer Player 2
    if (settings.humanPlayers > 1) {
      players.push(
        createDefaultTank('p2', 'PLAYER 2', TankType.scout, const Color(0xFFFF33FF), isRobot: false)
      );
    }

    // AI Robots
    final robotNames = ['AGGRESSOR', 'GUARDIAN', 'PHANTOM', 'HUNTER', 'DEFENDER'];
    final robotBehaviors = ['aggressive', 'cautious', 'ambusher', 'sniper', 'aggressive'];
    final robotColors = [
      const Color(0xFFFF6600),
      const Color(0xFF33FF33),
      const Color(0xFFFFCC00),
      const Color(0xFFCC33FF),
      const Color(0xFFFF3333),
    ];
    final robotHulls = [TankType.assault, TankType.scout, TankType.dreadnought, TankType.assault, TankType.dreadnought];

    for (int i = 0; i < settings.robotCount; i++) {
      players.add(
        createDefaultTank(
          'r$i',
          robotNames[i % robotNames.length],
          robotHulls[i % robotHulls.length],
          robotColors[i % robotColors.length],
          isRobot: true,
          robotBehavior: robotBehaviors[i % robotBehaviors.length],
        ),
      );
    }

    tanks = players;
    bullets = [];
    roundNum = 1;
    startRound();
  }

  void startRound() {
    final arena = arenas.firstWhere((a) => a.id == settings.arenaId, orElse: () => arenas.first);
    arrangeTanksAtSpawns(tanks, arena);
    bullets = [];
    timeLeft = settings.timeLimit;
    roundWinner = null;
    updateState('playing');

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (timeLeft <= 1) {
        timer.cancel();
        endRound(null, 'TIME EXPIRED');
        return;
      }
      timeLeft--;
      notifyListeners();
    });
  }

  void updateGameFrame(int timestampMs) {
    if (_currentState != 'playing') return;

    final arena = arenas.firstWhere((a) => a.id == settings.arenaId, orElse: () => arenas.first);

    // Run Dart physics frame updates
    final result = runEngineUpdate(
      tanks,
      bullets,
      arena,
      keysPressed,
      settings,
      timestampMs,
      p1JoystickX,
      p1JoystickY,
      p1VirtualFire,
      p1VirtualTool,
    );

    tanks = result.tanks;
    bullets = result.bullets;
    notifyListeners();

    // Check round conditions
    final aliveTanks = tanks.where((t) => !t.isDead).toList();
    if (aliveTanks.length == 1) {
      endRound(aliveTanks[0], 'DESTRUCTION SUCCESS');
    } else if (aliveTanks.isEmpty) {
      endRound(null, 'MUTUAL ANNIHILATION');
    }
  }

  void endRound(Tank? winner, String cause) {
    _timer?.cancel();
    _timer = null;
    roundWinner = winner;
    
    // Reward winner
    if (winner != null) {
      winner.score += 200;
      winner.money += 120;
    }

    // Consolation cash
    for (var tank in tanks) {
      if (!tank.isDead) {
        tank.money += 50;
      } else {
        tank.money += 20;
      }
    }

    updateState('round_over');
  }

  void cycleWeapon(String playerId) {
    final tank = tanks.firstWhere((t) => t.id == playerId);
    if (!tank.isDead) {
      int idx = tank.activeWeaponIndex;
      final startIdx = idx;
      do {
        idx = (idx + 1) % tank.weapons.length;
      } while (!tank.weapons[idx].unlocked && idx != startIdx);
      tank.activeWeaponIndex = idx;
      notifyListeners();
    }
  }

  void proceedToNextRound() {
    if (roundNum >= settings.roundLimit) {
      updateState('game_over');
    } else {
      roundNum++;
      if (roundNum == 4 || roundNum == 7 || roundNum == 10) {
        updateState('shop');
      } else {
        startRound();
      }
    }
  }

  void abortCombat() {
    _timer?.cancel();
    _timer = null;
    updateState('menu');
  }

  Tank getOverallWinner() {
    var champion = tanks.first;
    for (var tank in tanks) {
      if (tank.score > champion.score) {
        champion = tank;
      }
    }
    return champion;
  }

  void setJoystickInput(double x, double y) {
    p1JoystickX = x;
    p1JoystickY = y;
  }

  void setVirtualButtons(bool fire, bool tool) {
    p1VirtualFire = fire;
    p1VirtualTool = tool;
  }
}
