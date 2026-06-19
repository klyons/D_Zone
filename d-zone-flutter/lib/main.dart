import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:provider/provider.dart';
import 'game/game_state.dart';
import 'game/constants.dart';
import 'game/renderer.dart';
import 'components/retro_monitor.dart';
import 'components/main_menu.dart';
import 'components/shop.dart';
import 'components/game_hud.dart';

void main() {
  runApp(const DZoneApp());
}

class DZoneApp extends StatelessWidget {
  const DZoneApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'D-Zone Tank Battle',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF030308),
      ),
      home: ChangeNotifierProvider(
        create: (_) => GameStateProvider(),
        child: const GameHome(),
      ),
    );
  }
}

class GameHome extends StatefulWidget {
  const GameHome({Key? key}) : super(key: key);

  @override
  State<GameHome> createState() => _GameHomeState();
}

class _GameHomeState extends State<GameHome> with SingleTickerProviderStateMixin {
  late Ticker _ticker;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((elapsed) {
      final state = Provider.of<GameStateProvider>(context, listen: false);
      if (state.currentState == 'playing') {
        state.updateGameFrame(elapsed.inMilliseconds);
      }
    });
    _ticker.start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<GameStateProvider>(context);
    
    // Auto focus for keyboard input capture
    if (state.currentState == 'playing') {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _focusNode.requestFocus();
      });
    }

    return Scaffold(
      body: RetroMonitor(
        child: _buildCurrentScreen(state),
      ),
    );
  }

  Widget _buildCurrentScreen(GameStateProvider state) {
    switch (state.currentState) {
      case 'menu':
        return const MainMenuWidget();
      case 'shop':
        return const ShopWidget();
      case 'playing':
        return _buildCombatScreen(state);
      case 'round_over':
        return _buildOverlayScreen(
          title: 'ROUND COMPLETE',
          titleColor: const Color(0xFFFF3366),
          body: _buildRoundSummary(state),
          btnText: state.roundNum >= state.settings.roundLimit
              ? 'PROCEED TO FINAL STANDINGS'
              : 'PROCEED',
          onPressed: state.proceedToNextRound,
        );
      case 'game_over':
        final champion = state.getOverallWinner();
        return _buildOverlayScreen(
          title: 'SIMULATION OVER',
          titleColor: const Color(0xFF00FFFF),
          body: Column(
            children: [
              Text(
                'CHAMPION: ${champion.name}',
                style: TextStyle(color: champion.color, fontSize: 22, fontWeight: FontWeight.bold, fontFamily: 'Courier'),
              ),
              const SizedBox(height: 5),
              Text(
                'FINAL SCORE: ${champion.score} PTS',
                style: const TextStyle(color: Color(0xFF88CCFF), fontSize: 13, fontFamily: 'Courier'),
              ),
              const SizedBox(height: 20),
              _buildTanksTable(state.tanks),
            ],
          ),
          btnText: 'RETURN TO COMMAND MENU',
          onPressed: state.abortCombat,
        );
      default:
        return const MainMenuWidget();
    }
  }

  Widget _buildCombatScreen(GameStateProvider state) {
    final arena = arenas.firstWhere((a) => a.id == state.settings.arenaId, orElse: () => arenas.first);
    
    return Focus(
      focusNode: _focusNode,
      onKeyEvent: (node, event) {
        final key = event.logicalKey;
        final isDown = event is KeyEvent && event is! KeyUpEvent;
        
        state.keysPressed[key] = isDown;
        
        // Single press event for weapon cycling
        if (isDown) {
          if (key == LogicalKeyboardKey.keyE || key == LogicalKeyboardKey.slash) {
            state.cycleWeapon('p1');
          }
          if (key == LogicalKeyboardKey.keyO && state.settings.humanPlayers > 1) {
            state.cycleWeapon('p2');
          }
        }
        
        state.notifyListeners();
        return KeyEventResult.handled;
      },
      child: Stack(
        children: [
          // Render Custom Painter Canvas inside an aspect box
          Center(
            child: FittedBox(
              child: SizedBox(
                width: arena.width,
                height: arena.height,
                child: CustomPaint(
                  painter: GamePainter(
                    tanks: state.tanks,
                    bullets: state.bullets,
                    arena: arena,
                    timestampMs: DateTime.now().millisecondsSinceEpoch,
                  ),
                ),
              ),
            ),
          ),

          // HUD overlay
          GameHudWidget(
            onQuit: state.abortCombat,
          ),
        ],
      ),
    );
  }

  Widget _buildOverlayScreen({
    required String title,
    required Color titleColor,
    required Widget body,
    required String btnText,
    required VoidCallback onPressed,
  }) {
    return Container(
      color: const Color(0xF205050C),
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              title,
              style: TextStyle(
                color: titleColor,
                fontSize: 38,
                fontFamily: 'Courier',
                fontWeight: FontWeight.bold,
                letterSpacing: 4,
                shadows: [
                  Shadow(color: titleColor.withOpacity(0.5), blurRadius: 10),
                ],
              ),
            ),
            const SizedBox(height: 25),
            Container(
              maxWidth: 650,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0x9A0F0F1E),
                border: Border.all(color: const Color(0xFF005577), width: 1.5),
                borderRadius: BorderRadius.circular(8),
              ),
              child: body,
            ),
            const SizedBox(height: 30),
            SizedBox(
              height: 44,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6600),
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                ),
                onPressed: onPressed,
                child: Text(btnText, style: const TextStyle(fontFamily: 'Courier', fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.5)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoundSummary(GameStateProvider state) {
    final winner = state.roundWinner;
    return Column(
      children: [
        if (winner != null) ...[
          Text(
            '${winner.name} WINS THE COMBAT!',
            style: TextStyle(color: winner.color, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Courier'),
          ),
          const SizedBox(height: 5),
          const Text(
            '+200 PTS | +\$120 CREDITS AWARDED',
            style: TextStyle(color: Color(0xFF33FF33), fontSize: 11, fontFamily: 'Courier'),
          ),
        ] else ...[
          const Text(
            'MUTUAL ANNIHILATION',
            style: TextStyle(color: Color(0xFFFF6600), fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Courier'),
          ),
        ],
        const SizedBox(height: 20),
        _buildTanksTable(state.tanks),
      ],
    );
  }

  Widget _buildTanksTable(List<Tank> tanksList) {
    return Table(
      columnWidths: const {
        0: FlexColumnWidth(2),
        1: FlexColumnWidth(1),
        2: FlexColumnWidth(1),
        3: FlexColumnWidth(1),
      },
      children: [
        const TableRow(
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF005577), width: 2.0))),
          children: [
            Padding(padding: EdgeInsets.all(6), child: Text('PILOT', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 10, fontFamily: 'Courier', fontWeight: FontWeight.bold))),
            Padding(padding: EdgeInsets.all(6), child: Text('SCORE', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 10, fontFamily: 'Courier', fontWeight: FontWeight.bold))),
            Padding(padding: EdgeInsets.all(6), child: Text('CREDITS', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 10, fontFamily: 'Courier', fontWeight: FontWeight.bold))),
            Padding(padding: EdgeInsets.all(6), child: Text('STATUS', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 10, fontFamily: 'Courier', fontWeight: FontWeight.bold))),
          ],
        ),
        ...tanksList.map((tank) {
          return TableRow(
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white10))),
            children: [
              Padding(padding: const EdgeInsets.all(8), child: Text(tank.name, style: TextStyle(color: tank.color, fontSize: 11, fontFamily: 'Courier', fontWeight: FontWeight.bold))),
              Padding(padding: const EdgeInsets.all(8), child: Text('${tank.score}', style: TextStyle(color: tank.color, fontSize: 11, fontFamily: 'Courier'))),
              Padding(padding: const EdgeInsets.all(8), child: Text('\$${tank.money}', style: TextStyle(color: tank.color, fontSize: 11, fontFamily: 'Courier'))),
              Padding(padding: const EdgeInsets.all(8), child: Text(tank.isDead ? 'DESTROYED' : 'SURVIVED', style: TextStyle(color: tank.color, fontSize: 11, fontFamily: 'Courier'))),
            ],
          );
        }).toList(),
      ],
    );
  }
}
