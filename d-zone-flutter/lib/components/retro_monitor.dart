import 'dart:math';
import 'package:flutter/material.dart';

class RetroMonitor extends StatefulWidget {
  final Widget child;

  const RetroMonitor({Key? key, required this.child}) : super(key: key);

  @override
  State<RetroMonitor> createState() => _RetroMonitorState();
}

class _RetroMonitorState extends State<RetroMonitor> with SingleTickerProviderStateMixin {
  late AnimationController _flickerController;

  @override
  void initState() {
    super.initState();
    _flickerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _flickerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF030308),
      child: Center(
        child: Container(
          width: double.infinity,
          height: double.infinity,
          constraints: const BoxConstraints(
            maxWidth: 1100,
            maxHeight: 800,
          ),
          margin: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF111115),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF22222B), width: 6),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.9),
                blurRadius: 15,
                inset: true,
              ),
              BoxShadow(
                color: Colors.black.withOpacity(0.8),
                blurRadius: 30,
                offset: const Offset(0, 15),
              ),
            ],
          ),
          padding: const EdgeInsets.all(12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Stack(
              children: [
                // Game content
                Positioned.fill(child: widget.child),

                // 1. Scanlines overlay
                const Positioned.fill(
                  child: IgnorePointer(
                    child: ScanlineOverlay(),
                  ),
                ),

                // 2. Flicker layer
                Positioned.fill(
                  child: IgnorePointer(
                    child: AnimatedBuilder(
                      animation: _flickerController,
                      builder: (context, child) {
                        final opacity = 0.03 + Random().nextDouble() * 0.02;
                        return Container(
                          color: Color.fromRGBO(18, 16, 16, opacity),
                        );
                      },
                    ),
                  ),
                ),

                // 3. Vignette shadow
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.85),
                            blurRadius: 50,
                            spreadRadius: 2,
                            inset: true,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ScanlineOverlay extends StatelessWidget {
  const ScanlineOverlay({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _ScanlinePainter(),
    );
  }
}

class _ScanlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.2)
      ..strokeWidth = 1.0;
    
    // Draw horizontal scanline bars
    for (double y = 0; y < size.height; y += 4.0) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
