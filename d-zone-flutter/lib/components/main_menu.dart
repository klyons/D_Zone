import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../game/game_state.dart';
import '../game/constants.dart';

class MainMenuWidget extends StatelessWidget {
  const MainMenuWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<GameStateProvider>(context);
    final settings = state.settings;

    return Container(
      decoration: const BoxDecoration(
        radialGradient: RadialGradient(
          center: Alignment.center,
          radius: 1.2,
          colors: [
            Color(0xFF0E0E1F),
            Color(0xFF030308),
          ],
        ),
      ),
      padding: const EdgeInsets.all(24),
      child: ListView(
        children: [
          const SizedBox(height: 20),
          // Title
          Center(
            child: Column(
              children: [
                Text(
                  'D-ZONE',
                  style: TextStyle(
                    color: const Color(0xFF00FFFF),
                    fontSize: 56,
                    fontFamily: 'Courier',
                    fontWeight: FontWeight.w900,
                    letterSpacing: 10,
                    shadows: [
                      Shadow(color: const Color(0xFF00FFFF).withOpacity(0.8), blurRadius: 10),
                      Shadow(color: const Color(0xFF00FFFF).withOpacity(0.4), blurRadius: 25),
                    ],
                  ),
                ),
                const SizedBox(height: 5),
                const Text(
                  'DESTRUCTION ZONE - 1990S TANK CLONE',
                  style: TextStyle(
                    color: Color(0xFFFF6600),
                    fontSize: 12,
                    fontFamily: 'Courier',
                    letterSpacing: 3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),

          // Columns layout
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth > 700;
              final content = [
                // Config Panel
                Expanded(
                  flex: isWide ? 1 : 0,
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xDA0A0A14),
                      border: Border.all(color: const Color(0xFF005577), width: 1.5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'COMBAT OPTIONS',
                          style: TextStyle(color: Color(0xFF00FFFF), fontSize: 18, fontFamily: 'Courier', letterSpacing: 2, fontWeight: FontWeight.bold),
                        ),
                        const Divider(color: Color(0xFF005577), height: 20, thickness: 1.5),
                        const SizedBox(height: 10),

                        // Players toggle
                        const Text('HUMAN PLAYERS:', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 11, fontFamily: 'Courier')),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _menuBtn(
                              text: '1 PLAYER',
                              active: settings.humanPlayers == 1,
                              onPressed: () {
                                settings.humanPlayers = 1;
                                state.notifyListeners();
                              },
                            ),
                            const SizedBox(width: 10),
                            _menuBtn(
                              text: '2 PLAYERS',
                              active: settings.humanPlayers == 2,
                              onPressed: () {
                                settings.humanPlayers = 2;
                                state.notifyListeners();
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // Robots slider
                        const Text('ROBOT COMBATANTS:', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 11, fontFamily: 'Courier')),
                        const SizedBox(height: 8),
                        Row(
                          children: [1, 2, 3, 4, 5].map((num) {
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: _menuBtn(
                                text: '$num',
                                active: settings.robotCount == num,
                                small: true,
                                onPressed: () {
                                  settings.robotCount = num;
                                  state.notifyListeners();
                                },
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 18),

                        // Arena Select
                        const Text('TACTICAL ARENA:', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 11, fontFamily: 'Courier')),
                        const SizedBox(height: 8),
                        Theme(
                          data: ThemeData.dark().copyWith(canvasColor: const Color(0xFF0C0D17)),
                          child: DropdownButtonFormField<String>(
                            value: settings.arenaId,
                            decoration: const InputDecoration(
                              enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF005577))),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                            style: const TextStyle(color: Color(0xFF88CCFF), fontFamily: 'Courier', fontSize: 13),
                            items: arenas.map((a) {
                              return DropdownMenuItem(value: a.id, child: Text(a.name));
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                settings.arenaId = val;
                                state.notifyListeners();
                              }
                            },
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Sound setting
                        const Text('SOUND EFFECTS:', style: TextStyle(color: Color(0xFF88CCFF), fontSize: 11, fontFamily: 'Courier')),
                        const SizedBox(height: 8),
                        _menuBtn(
                          text: settings.soundEnabled ? 'ENABLED' : 'DISABLED',
                          active: settings.soundEnabled,
                          onPressed: () {
                            settings.soundEnabled = !settings.soundEnabled;
                            state.notifyListeners();
                          },
                        ),
                        const SizedBox(height: 30),

                        // Start Button
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFFF6600),
                              foregroundColor: Colors.black,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                              textStyle: const TextStyle(fontFamily: 'Courier', fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 2),
                            ),
                            onPressed: state.initGame,
                            child: const Text('INITIALIZE SIMULATION'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                if (isWide) const SizedBox(width: 24),
                if (!isWide) const SizedBox(height: 24),

                // Manual Panel
                Expanded(
                  flex: isWide ? 1 : 0,
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xDA0A0A14),
                      border: Border.all(color: const Color(0xFFFF6600), width: 1.5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'FLIGHT MANUAL',
                          style: TextStyle(color: Color(0xFFFF6600), fontSize: 18, fontFamily: 'Courier', letterSpacing: 2, fontWeight: FontWeight.bold),
                        ),
                        const Divider(color: Color(0xFFFF6600), height: 20, thickness: 1.5),
                        const SizedBox(height: 10),

                        const Text('OBJECTIVE', style: TextStyle(color: Color(0xFFFF6600), fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                        const SizedBox(height: 5),
                        const Text(
                          'Destroy all other tanks. If your tank runs out of energy or weapon fuel (visualized by the cylinders on the back of your tank), retreat to any of the 4 glowing corner Light Absorbers to recharge.',
                          style: TextStyle(color: Color(0xFFA0B0C0), fontSize: 11, fontFamily: 'Courier', height: 1.5),
                        ),
                        const SizedBox(height: 20),

                        const Text('KEYBOARD CONTROLS', style: TextStyle(color: Color(0xFFFF6600), fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                        const SizedBox(height: 10),
                        
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text('PLAYER 1', style: TextStyle(color: Color(0xFF00FFFF), fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                                  SizedBox(height: 6),
                                  Text('• Move: ARROW keys / WASD\n• Fire: SPACE / Left SHIFT\n• Cycle Weapon: E / (/)\n• Tool: Q / (.)',
                                      style: TextStyle(color: Color(0xFFA0B0C0), fontSize: 10, fontFamily: 'Courier', height: 1.5)),
                                ],
                              ),
                            ),
                            if (settings.humanPlayers > 1) ...[
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: const [
                                    Text('PLAYER 2', style: TextStyle(color: Color(0xFFFF33FF), fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                                    SizedBox(height: 6),
                                    Text('• Move: I / K / J / L keys\n• Fire: F / H keys\n• Cycle Weapon: O key\n• Tool: U key',
                                        style: TextStyle(color: Color(0xFFA0B0C0), fontSize: 10, fontFamily: 'Courier', height: 1.5)),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 15),
                        const Text('MOBILE ON-SCREEN CONTROLLER', style: TextStyle(color: Color(0xFFFF6600), fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                        const SizedBox(height: 5),
                        const Text(
                          'On tablets or phones, a virtual touch joystick on the bottom-left guides movement, while buttons on the right activate laser fire and defense systems.',
                          style: TextStyle(color: Color(0xFFA0B0C0), fontSize: 10, fontFamily: 'Courier', height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ),
              ];

              return isWide
                  ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: content)
                  : Column(children: content);
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _menuBtn({
    required String text,
    required bool active,
    required VoidCallback onPressed,
    bool small = false,
  }) {
    return Expanded(
      flex: small ? 0 : 1,
      child: SizedBox(
        height: 38,
        width: small ? 42 : null,
        child: OutlinedButton(
          style: OutlinedButton.styleFrom(
            backgroundColor: active ? const Color(0xFF00FFFF) : const Color(0xFF0D1622),
            side: BorderSide(color: active ? const Color(0xFF00FFFF) : const Color(0xFF005577), width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
            padding: EdgeInsets.zero,
          ),
          onPressed: onPressed,
          child: Text(
            text,
            style: TextStyle(
              color: active ? const Color(0xFF050510) : const Color(0xFF88CCFF),
              fontFamily: 'Courier',
              fontWeight: active ? FontWeight.bold : FontWeight.normal,
              fontSize: 12,
              letterSpacing: 1,
            ),
          ),
        ),
      ),
    );
  }
}
