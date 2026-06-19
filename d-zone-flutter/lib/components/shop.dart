import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../game/game_state.dart';
import '../game/models.dart';
import '../game/constants.dart';

class ShopWidget extends StatefulWidget {
  const ShopWidget({Key? key}) : super(key: key);

  @override
  State<ShopWidget> createState() => _ShopWidgetState();
}

class _ShopWidgetState extends State<ShopWidget> {
  int _currentPlayerIdx = 0;
  late List<Tank> _tempTanks;

  @override
  void initState() {
    super.initState();
    final state = Provider.of<GameStateProvider>(context, listen: false);
    _tempTanks = state.tanks; // Reference tanks to edit in shop
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<GameStateProvider>(context);
    final humanTanks = _tempTanks.where((t) => !t.isRobot).toList().sublist(0, state.settings.humanPlayers);

    if (_currentPlayerIdx >= humanTanks.length) {
      return const Center(child: Text('Armory Sync Complete...', style: TextStyle(color: Colors.white, fontFamily: 'Courier')));
    }

    final currentTank = humanTanks[_currentPlayerIdx];

    int getPrice(int basePrice) {
      return currentTank.hasDiscount ? (basePrice * 0.75).floor() : basePrice;
    }

    void buyDiscount() {
      const cost = UpgradePrices.discountMembership;
      if (currentTank.money >= cost && !currentTank.hasDiscount) {
        setState(() {
          currentTank.money -= cost;
          currentTank.hasDiscount = true;
        });
      }
    }

    void buyWeapon(String weaponId, int cost) {
      final actualCost = getPrice(cost);
      if (currentTank.money >= actualCost) {
        final weapon = currentTank.weapons.firstWhere((w) => w.id == weaponId);
        if (!weapon.unlocked) {
          setState(() {
            currentTank.money -= actualCost;
            weapon.unlocked = true;
          });
        }
      }
    }

    void buyTool(String toolId, int cost) {
      final actualCost = getPrice(cost);
      if (currentTank.money >= actualCost) {
        final tool = currentTank.tools.firstWhere((t) => t.id == toolId);
        if (!tool.unlocked) {
          setState(() {
            currentTank.money -= actualCost;
            tool.unlocked = true;
          });
        }
      }
    }

    void buyUpgrade(String type, int cost) {
      final actualCost = getPrice(cost);
      if (currentTank.money >= actualCost) {
        setState(() {
          if (type == 'speed' && currentTank.upgrades.speed < 3) {
            currentTank.money -= actualCost;
            currentTank.upgrades.speed += 1;
          } else if (type == 'rotation' && currentTank.upgrades.rotation < 3) {
            currentTank.money -= actualCost;
            currentTank.upgrades.rotation += 1;
          } else if (type == 'armor' && currentTank.upgrades.armor < 3) {
            currentTank.money -= actualCost;
            currentTank.upgrades.armor += 1;
            final config = tankConfigs[currentTank.type]!;
            currentTank.maxHealth = config.maxHealth + currentTank.upgrades.armor * 30.0;
            currentTank.health = currentTank.maxHealth;
          }
        });
      }
    }

    void applyService(String type, int cost) {
      if (currentTank.money >= cost) {
        setState(() {
          if (type == 'fuel' && currentTank.fuel < currentTank.maxFuel) {
            currentTank.money -= cost;
            currentTank.fuel = currentTank.maxFuel;
          } else if (type == 'armor' && currentTank.health < currentTank.maxHealth) {
            currentTank.money -= cost;
            currentTank.health = currentTank.maxHealth;
          }
        });
      }
    }

    void buyHull(TankType type, int cost) {
      final actualCost = getPrice(cost);
      if (currentTank.money >= actualCost && currentTank.type != type) {
        setState(() {
          currentTank.money -= actualCost;
          currentTank.type = type;
          final config = tankConfigs[type]!;
          currentTank.maxHealth = config.maxHealth + currentTank.upgrades.armor * 30.0;
          currentTank.health = currentTank.maxHealth;
          currentTank.maxFuel = config.maxFuel;
          currentTank.fuel = config.maxFuel;
        });
      }
    }

    void finishTurn() {
      if (_currentPlayerIdx < humanTanks.length - 1) {
        setState(() {
          _currentPlayerIdx++;
        });
      } else {
        // Run AI shopping updates and proceed to round!
        for (var tank in _tempTanks) {
          if (tank.isRobot) {
            int cash = tank.money;
            final rand = Random();

            if (cash > 250 && !tank.hasDiscount) {
              tank.hasDiscount = true;
              cash -= 150;
            }

            for (var w in tank.weapons) {
              final baseCost = w.id == 'plasma' ? 80 : w.id == 'seeker' ? 160 : w.id == 'spread' ? 120 : w.id == 'bounce' ? 100 : w.id == 'mine' ? 140 : 0;
              final cost = tank.hasDiscount ? (baseCost * 0.75).floor() : baseCost;
              if (!w.unlocked && cash >= cost && baseCost > 0) {
                w.unlocked = true;
                cash -= cost;
              }
            }

            for (var t in tank.tools) {
              final cost = tank.hasDiscount ? (100 * 0.75).floor() : 100;
              if (!t.unlocked && cash >= cost) {
                t.unlocked = true;
                cash -= cost;
              }
            }

            final types = ['speed', 'rotation', 'armor'];
            for (int i = 0; i < 3; i++) {
              final type = types[rand.nextInt(types.length)];
              final baseCost = type == 'speed' ? 80 : type == 'rotation' ? 60 : 100;
              final cost = tank.hasDiscount ? (baseCost * 0.75).floor() : baseCost;

              if (type == 'speed' && tank.upgrades.speed < 3 && cash >= cost) {
                tank.upgrades.speed++;
                cash -= cost;
              } else if (type == 'rotation' && tank.upgrades.rotation < 3 && cash >= cost) {
                tank.upgrades.rotation++;
                cash -= cost;
              } else if (type == 'armor' && tank.upgrades.armor < 3 && cash >= cost) {
                tank.upgrades.armor++;
                tank.maxHealth = tankConfigs[tank.type]!.maxHealth + tank.upgrades.armor * 30.0;
                cash -= cost;
              }
            }

            tank.health = tank.maxHealth;
            tank.fuel = tank.maxFuel;
            tank.money = cash;
          } else {
            tank.health = tank.maxHealth;
            tank.fuel = tank.maxFuel;
          }
        }

        state.tanks = _tempTanks;
        state.proceedToNextRound();
      }
    }

    return Container(
      decoration: const BoxDecoration(
        radialGradient: RadialGradient(
          colors: [Color(0xFF0C0D1C), Color(0xFF030308)],
          radius: 1.2,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('TACTICAL WEAPONS SHOP', style: TextStyle(color: Color(0xFFFF6600), fontSize: 20, fontFamily: 'Courier', fontWeight: FontWeight.bold, letterSpacing: 1.5)),
              Text(
                'PILOT: ${currentTank.name}',
                style: TextStyle(color: currentTank.color, fontSize: 14, fontFamily: 'Courier', fontWeight: FontWeight.bold, shadows: [
                  Shadow(color: currentTank.color.withOpacity(0.5), blurRadius: 6),
                ]),
              ),
              Row(
                children: [
                  const Text('CREDITS: ', style: TextStyle(color: Color(0xFFA0B0C0), fontSize: 14, fontFamily: 'Courier')),
                  Text('\$${currentTank.money}', style: const TextStyle(color: Color(0xFF33FF33), fontSize: 16, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                  if (currentTank.hasDiscount) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      decoration: BoxDecoration(border: Border.all(color: const Color(0xFF33FF33)), borderRadius: BorderRadius.circular(3), color: const Color(0x2233FF33)),
                      child: const Text('25% OFF', style: TextStyle(color: Color(0xFF33FF33), fontSize: 9, fontFamily: 'Courier')),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const Divider(color: Color(0xFFFF6600), height: 20, thickness: 1.5),

          // Store splits
          Expanded(
            child: Row(
              children: [
                // Armory
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(color: const Color(0xEA0A0C1A), border: Border.all(color: const Color(0xFF005577)), borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('ARMORY', style: TextStyle(color: Color(0xFF00FFFF), fontSize: 16, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        Expanded(
                          child: ListView(
                            children: [
                              // Discount Card
                              _shopCard(
                                name: 'Discount Membership',
                                desc: 'Get 25% off on all subsequent armory items.',
                                cost: UpgradePrices.discountMembership,
                                owned: currentTank.hasDiscount,
                                disabled: currentTank.money < UpgradePrices.discountMembership,
                                onBuy: buyDiscount,
                              ),
                              const SizedBox(height: 10),
                              
                              // Laser is starting, skip showing. Show others:
                              ...defaultWeapons.sublist(1).map((wDef) {
                                final wOwned = currentTank.weapons.firstWhere((w) => w.id == wDef.id).unlocked;
                                final cost = wDef.id == 'plasma' ? 80 : wDef.id == 'seeker' ? 160 : wDef.id == 'spread' ? 120 : wDef.id == 'bounce' ? 100 : 140;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _shopCard(
                                    name: wDef.name,
                                    desc: wDef.description,
                                    cost: getPrice(cost),
                                    owned: wOwned,
                                    disabled: currentTank.money < getPrice(cost),
                                    onBuy: () => buyWeapon(wDef.id, cost),
                                    color: wDef.color,
                                  ),
                                );
                              }).toList(),

                              ...defaultTools.map((tDef) {
                                final tOwned = currentTank.tools.firstWhere((t) => t.id == tDef.id).unlocked;
                                const cost = 100;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _shopCard(
                                    name: tDef.name,
                                    desc: tDef.description,
                                    cost: getPrice(cost),
                                    owned: tOwned,
                                    disabled: currentTank.money < getPrice(cost),
                                    onBuy: () => buyTool(tDef.id, cost),
                                    color: const Color(0xFFFF33FF),
                                  ),
                                );
                              }).toList(),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // Engineering
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(color: const Color(0xEA0A0C1A), border: Border.all(color: const Color(0xFF005577)), borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('ENGINEERING', style: TextStyle(color: Color(0xFF00FFFF), fontSize: 16, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        Expanded(
                          child: ListView(
                            children: [
                              _shopCard(
                                name: 'Thruster Velocity',
                                desc: 'Upgrade tank speed (Level ${currentTank.upgrades.speed}/3)',
                                cost: getPrice(UpgradePrices.tankSpeed),
                                owned: currentTank.upgrades.speed >= 3,
                                disabled: currentTank.money < getPrice(UpgradePrices.tankSpeed),
                                onBuy: () => buyUpgrade('speed', UpgradePrices.tankSpeed),
                              ),
                              const SizedBox(height: 10),
                              _shopCard(
                                name: 'Rotational Servos',
                                desc: 'Upgrade turning speed (Level ${currentTank.upgrades.rotation}/3)',
                                cost: getPrice(UpgradePrices.tankRotation),
                                owned: currentTank.upgrades.rotation >= 3,
                                disabled: currentTank.money < getPrice(UpgradePrices.tankRotation),
                                onBuy: () => buyUpgrade('rotation', UpgradePrices.tankRotation),
                              ),
                              const SizedBox(height: 10),
                              _shopCard(
                                name: 'Durasteel Plating',
                                desc: 'Upgrade max armor (+30 Max Health) (Level ${currentTank.upgrades.armor}/3)',
                                cost: getPrice(UpgradePrices.tankArmor),
                                owned: currentTank.upgrades.armor >= 3,
                                disabled: currentTank.money < getPrice(UpgradePrices.tankArmor),
                                onBuy: () => buyUpgrade('armor', UpgradePrices.tankArmor),
                              ),
                              const SizedBox(height: 18),
                              
                              const Text('HULL RE-CLASSIFICATION', style: TextStyle(color: Color(0xFFFF6600), fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              ...tankConfigs.entries.map((entry) {
                                final hull = entry.value;
                                final isActive = currentTank.type == entry.key;
                                return Card(
                                  color: isActive ? const Color(0x33FF6600) : const Color(0xFF0D1622),
                                  shape: RoundedRectangleBorder(
                                    side: BorderSide(color: isActive ? const Color(0xFFFF6600) : const Color(0xFF003355)),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: ListTile(
                                    title: Text(hull.name, style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                                    subtitle: Text(hull.description, style: const TextStyle(color: Color(0xFFA0B0C0), fontSize: 10, fontFamily: 'Courier')),
                                    trailing: isActive
                                        ? const Text('EQUIPPED', style: TextStyle(color: Color(0xFFFF6600), fontSize: 11, fontFamily: 'Courier', fontWeight: FontWeight.bold))
                                        : ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005577)),
                                            onPressed: currentTank.money >= getPrice(hull.cost) ? () => buyHull(entry.key, hull.cost) : null,
                                            child: Text('\$${getPrice(hull.cost)}', style: const TextStyle(fontSize: 11, fontFamily: 'Courier')),
                                          ),
                                  ),
                                );
                              }).toList(),
                              const SizedBox(height: 18),

                              const Text('MAINTENANCE BAY', style: TextStyle(color: Color(0xFFFF6600), fontSize: 12, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF12241A), foregroundColor: const Color(0xFF33FF33)),
                                      onPressed: currentTank.money >= UpgradePrices.refillFuel && currentTank.fuel < currentTank.maxFuel
                                          ? () => applyService('fuel', UpgradePrices.refillFuel)
                                          : null,
                                      child: const Text('Refill Fuel (\$20)', style: TextStyle(fontSize: 11, fontFamily: 'Courier')),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF12241A), foregroundColor: const Color(0xFF33FF33)),
                                      onPressed: currentTank.money >= UpgradePrices.refillHealth && currentTank.health < currentTank.maxHealth
                                          ? () => applyService('armor', UpgradePrices.refillHealth)
                                          : null,
                                      child: const Text('Repair Chassis (\$30)', style: TextStyle(fontSize: 11, fontFamily: 'Courier')),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 15),

          // Confirm button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF6600), foregroundColor: Colors.black),
              onPressed: finishTurn,
              child: Text(
                _currentPlayerIdx < humanTanks.length - 1 ? 'PROCEED TO NEXT PLAYER' : 'LAUNCH NEXT ROUND',
                style: const TextStyle(fontFamily: 'Courier', fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 1),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _shopCard({
    required String name,
    required String desc,
    required int cost,
    required bool owned,
    required bool disabled,
    required VoidCallback onBuy,
    Color? color,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0x800D1625),
        border: Border.all(color: owned ? const Color(0x66005577) : const Color(0xFF003355)),
        borderRadius: BorderRadius.circular(5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: TextStyle(color: color ?? Colors.white, fontSize: 13, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                const SizedBox(height: 3),
                Text(desc, style: const TextStyle(color: Color(0xFF8090A0), fontSize: 10, fontFamily: 'Courier')),
              ],
            ),
          ),
          const SizedBox(width: 8),
          owned
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  decoration: BoxDecoration(border: Border.all(color: const Color(0xFF33FF33)), borderRadius: BorderRadius.circular(3)),
                  child: const Text('OWNED', style: TextStyle(color: Color(0xFF33FF33), fontSize: 10, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
                )
              : SizedBox(
                  height: 32,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005577)),
                    onPressed: disabled ? null : onBuy,
                    child: Text('\$$cost', style: const TextStyle(fontFamily: 'Courier', fontSize: 11)),
                  ),
                ),
        ],
      ),
    );
  }
}
