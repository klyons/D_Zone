import React, { useState } from 'react';
import { Tank, Weapon, Tool, TankType } from '../game/types';
import { TANK_DEFS, UPGRADE_PRICES, WEAPON_DEFS, TOOL_DEFS } from '../game/constants';
import './Shop.css';

interface ShopProps {
  tanks: Tank[];
  humanPlayersCount: number;
  onFinishShopping: (updatedTanks: Tank[]) => void;
}

export const Shop: React.FC<ShopProps> = ({ tanks, humanPlayersCount, onFinishShopping }) => {
  // Filter only human players to shop
  const humanTanks = tanks.filter(t => !t.isRobot).slice(0, humanPlayersCount);
  
  // Track which player's turn it is to shop
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [tempTanks, setTempTanks] = useState<Tank[]>(JSON.parse(JSON.stringify(tanks)));

  const currentTank = tempTanks.find(t => t.id === humanTanks[currentPlayerIdx]?.id);

  if (!currentTank) {
    // Fallback if something is wrong
    return <div className="shop-error">Loading Tactical Armory...</div>;
  }

  // Cost calculator based on Discount Membership
  const getPrice = (basePrice: number) => {
    return currentTank.hasDiscount ? Math.floor(basePrice * 0.75) : basePrice;
  };

  const handleBuyDiscount = () => {
    const cost = UPGRADE_PRICES.discountMembership; // No discount on membership itself!
    if (currentTank.money >= cost && !currentTank.hasDiscount) {
      currentTank.money -= cost;
      currentTank.hasDiscount = true;
      setTempTanks([...tempTanks]);
    }
  };

  const handleBuyWeapon = (weaponId: string, cost: number) => {
    const actualCost = getPrice(cost);
    if (currentTank.money >= actualCost) {
      const weapon = currentTank.weapons.find(w => w.id === weaponId);
      if (weapon && !weapon.unlocked) {
        currentTank.money -= actualCost;
        weapon.unlocked = true;
        setTempTanks([...tempTanks]);
      }
    }
  };

  const handleBuyTool = (toolId: string, cost: number) => {
    const actualCost = getPrice(cost);
    if (currentTank.money >= actualCost) {
      const tool = currentTank.tools.find(t => t.id === toolId);
      if (tool && !tool.unlocked) {
        // Lock other tools to ensure they carry one tool at a time (retro limit) or let them unlock multiple.
        // Let's let them unlock both, but they use the active one.
        currentTank.money -= actualCost;
        tool.unlocked = true;
        setTempTanks([...tempTanks]);
      }
    }
  };

  const handleBuyUpgrade = (type: 'speed' | 'rotation' | 'armor', cost: number) => {
    const actualCost = getPrice(cost);
    if (currentTank.money >= actualCost) {
      if (type === 'speed' && currentTank.upgrades.speed < 3) {
        currentTank.money -= actualCost;
        currentTank.upgrades.speed += 1;
      } else if (type === 'rotation' && currentTank.upgrades.rotation < 3) {
        currentTank.money -= actualCost;
        currentTank.upgrades.rotation += 1;
      } else if (type === 'armor' && currentTank.upgrades.armor < 3) {
        currentTank.money -= actualCost;
        currentTank.upgrades.armor += 1;
        // Adjust max health
        const baseDef = TANK_DEFS[currentTank.type];
        currentTank.maxHealth = baseDef.maxHealth + currentTank.upgrades.armor * 30;
        currentTank.health = currentTank.maxHealth; // Full heal on armor upgrade
      }
      setTempTanks([...tempTanks]);
    }
  };

  const handleService = (type: 'fuel' | 'armor', cost: number) => {
    if (currentTank.money >= cost) {
      if (type === 'fuel' && currentTank.fuel < currentTank.maxFuel) {
        currentTank.money -= cost;
        currentTank.fuel = currentTank.maxFuel;
      } else if (type === 'armor' && currentTank.health < currentTank.maxHealth) {
        currentTank.money -= cost;
        currentTank.health = currentTank.maxHealth;
      }
      setTempTanks([...tempTanks]);
    }
  };

  const handleBuyTankHull = (hullType: TankType, cost: number) => {
    const actualCost = getPrice(cost);
    if (currentTank.money >= actualCost && currentTank.type !== hullType) {
      currentTank.money -= actualCost;
      currentTank.type = hullType;
      
      const newConfig = TANK_DEFS[hullType];
      currentTank.maxHealth = newConfig.maxHealth + currentTank.upgrades.armor * 30;
      currentTank.health = currentTank.maxHealth;
      currentTank.maxFuel = newConfig.maxFuel;
      currentTank.fuel = newConfig.maxFuel;
      
      setTempTanks([...tempTanks]);
    }
  };

  const handleDone = () => {
    if (currentPlayerIdx < humanTanks.length - 1) {
      setCurrentPlayerIdx(currentPlayerIdx + 1);
    } else {
      // Auto upgrade computer robots with their cash so they stay competitive!
      const updatedTanks = tempTanks.map(tank => {
        if (tank.isRobot) {
          // Robot logic: spend cash on random upgrades/weapons
          let cash = tank.money;
          
          // Try to buy membership first if rich
          if (cash > 250 && !tank.hasDiscount) {
            tank.hasDiscount = true;
            cash -= 150;
          }

          // Try to unlock weapons
          tank.weapons.forEach(w => {
            const cost = w.id === 'plasma' ? 80 : w.id === 'seeker' ? 160 : w.id === 'spread' ? 120 : w.id === 'bounce' ? 100 : w.id === 'mine' ? 140 : 0;
            const discountedCost = tank.hasDiscount ? Math.floor(cost * 0.75) : cost;
            if (!w.unlocked && cash >= discountedCost && cost > 0) {
              w.unlocked = true;
              cash -= discountedCost;
            }
          });

          // Try to unlock tools
          tank.tools.forEach(t => {
            const discountedCost = tank.hasDiscount ? Math.floor(100 * 0.75) : 100;
            if (!t.unlocked && cash >= discountedCost) {
              t.unlocked = true;
              cash -= discountedCost;
            }
          });

          // Random upgrades
          const upgradeTypes: Array<'speed' | 'rotation' | 'armor'> = ['speed', 'rotation', 'armor'];
          for (let i = 0; i < 4; i++) {
            const type = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
            const baseCost = type === 'speed' ? 80 : type === 'rotation' ? 60 : 100;
            const cost = tank.hasDiscount ? Math.floor(baseCost * 0.75) : baseCost;
            
            if (type === 'speed' && tank.upgrades.speed < 3 && cash >= cost) {
              tank.upgrades.speed += 1;
              cash -= cost;
            } else if (type === 'rotation' && tank.upgrades.rotation < 3 && cash >= cost) {
              tank.upgrades.rotation += 1;
              cash -= cost;
            } else if (type === 'armor' && tank.upgrades.armor < 3 && cash >= cost) {
              tank.upgrades.armor += 1;
              tank.maxHealth = TANK_DEFS[tank.type].maxHealth + tank.upgrades.armor * 30;
              cash -= cost;
            }
          }

          // Always top up health and fuel
          tank.health = tank.maxHealth;
          tank.fuel = tank.maxFuel;
          tank.money = cash;
        } else {
          // Heal human players between rounds anyway, but charging is also fine.
          // Let's reset health/fuel to full for everyone to make next rounds fresh
          tank.health = tank.maxHealth;
          tank.fuel = tank.maxFuel;
        }
        return tank;
      });

      onFinishShopping(updatedTanks);
    }
  };

  return (
    <div className="shop-container">
      <div className="shop-header">
        <h1 className="shop-title">TACTICAL WEAPONS SHOP</h1>
        <div className="shop-turn-indicator">
          SHOPPING: <span className="player-highlight" style={{ color: currentTank.color }}>{currentTank.name}</span>
        </div>
        <div className="shop-balance">
          CREDITS: <span className="money-count">${currentTank.money}</span>
          {currentTank.hasDiscount && <span className="discount-tag">MEMBER (25% OFF)</span>}
        </div>
      </div>

      <div className="shop-body">
        {/* Left pane: Weapons & Tools */}
        <div className="shop-pane">
          <h2 className="pane-title">ARMORY</h2>
          
          <div className="shop-grid">
            {/* Discount Membership */}
            {!currentTank.hasDiscount ? (
              <div className="shop-item">
                <div className="item-info">
                  <span className="item-name">Discount Membership</span>
                  <span className="item-desc">Get 25% off on all armory and upgrade purchases.</span>
                </div>
                <button
                  className="buy-btn"
                  disabled={currentTank.money < UPGRADE_PRICES.discountMembership}
                  onClick={handleBuyDiscount}
                >
                  ${UPGRADE_PRICES.discountMembership}
                </button>
              </div>
            ) : (
              <div className="shop-item owned">
                <div className="item-info">
                  <span className="item-name">Discount Membership</span>
                  <span className="item-desc">Already activated. 25% discount applied.</span>
                </div>
                <span className="owned-label">ACTIVE</span>
              </div>
            )}

            {/* Weapons */}
            {WEAPON_DEFS.slice(1).map((wDef) => {
              const currentWeapon = currentTank.weapons.find(w => w.id === wDef.id);
              const cost = wDef.id === 'plasma' ? 80 : wDef.id === 'seeker' ? 160 : wDef.id === 'spread' ? 120 : wDef.id === 'bounce' ? 100 : 140;
              const isUnlocked = currentWeapon?.unlocked;

              return (
                <div key={wDef.id} className={`shop-item ${isUnlocked ? 'owned' : ''}`}>
                  <div className="item-info">
                    <span className="item-name" style={{ color: wDef.color }}>{wDef.name}</span>
                    <span className="item-desc">{wDef.description}</span>
                  </div>
                  {isUnlocked ? (
                    <span className="owned-label">OWNED</span>
                  ) : (
                    <button
                      className="buy-btn"
                      disabled={currentTank.money < getPrice(cost)}
                      onClick={() => handleBuyWeapon(wDef.id, cost)}
                    >
                      ${getPrice(cost)}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Tools */}
            {TOOL_DEFS.map((tDef) => {
              const currentTool = currentTank.tools.find(t => t.id === tDef.id);
              const isUnlocked = currentTool?.unlocked;
              const cost = 100;

              return (
                <div key={tDef.id} className={`shop-item ${isUnlocked ? 'owned' : ''}`}>
                  <div className="item-info">
                    <span className="item-name" style={{ color: '#ff33ff' }}>{tDef.name}</span>
                    <span className="item-desc">{tDef.description}</span>
                  </div>
                  {isUnlocked ? (
                    <span className="owned-label">OWNED</span>
                  ) : (
                    <button
                      className="buy-btn"
                      disabled={currentTank.money < getPrice(cost)}
                      onClick={() => handleBuyTool(tDef.id, cost)}
                    >
                      ${getPrice(cost)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right pane: Tank hulls & Stats upgrades */}
        <div className="shop-pane">
          <h2 className="pane-title">ENGINEERING</h2>

          {/* Upgrades Section */}
          <div className="upgrades-section">
            <h3 className="sub-title">CORE SYSTEMS UPGRADES</h3>
            
            {/* Speed Upgrade */}
            <div className="shop-item">
              <div className="item-info">
                <span className="item-name">Thruster Velocity</span>
                <span className="item-desc">Increase acceleration & maximum speed (Level {currentTank.upgrades.speed}/3)</span>
              </div>
              {currentTank.upgrades.speed >= 3 ? (
                <span className="owned-label">MAX</span>
              ) : (
                <button
                  className="buy-btn"
                  disabled={currentTank.money < getPrice(UPGRADE_PRICES.tankSpeed)}
                  onClick={() => handleBuyUpgrade('speed', UPGRADE_PRICES.tankSpeed)}
                >
                  ${getPrice(UPGRADE_PRICES.tankSpeed)}
                </button>
              )}
            </div>

            {/* Rotation Upgrade */}
            <div className="shop-item">
              <div className="item-info">
                <span className="item-name">Rotational Servos</span>
                <span className="item-desc">Increase turning speed and torque (Level {currentTank.upgrades.rotation}/3)</span>
              </div>
              {currentTank.upgrades.rotation >= 3 ? (
                <span className="owned-label">MAX</span>
              ) : (
                <button
                  className="buy-btn"
                  disabled={currentTank.money < getPrice(UPGRADE_PRICES.tankRotation)}
                  onClick={() => handleBuyUpgrade('rotation', UPGRADE_PRICES.tankRotation)}
                >
                  ${getPrice(UPGRADE_PRICES.tankRotation)}
                </button>
              )}
            </div>

            {/* Armor Upgrade */}
            <div className="shop-item">
              <div className="item-info">
                <span className="item-name">Durasteel Armor Plating</span>
                <span className="item-desc">Add +30 Max Health and repair chassis (Level {currentTank.upgrades.armor}/3)</span>
              </div>
              {currentTank.upgrades.armor >= 3 ? (
                <span className="owned-label">MAX</span>
              ) : (
                <button
                  className="buy-btn"
                  disabled={currentTank.money < getPrice(UPGRADE_PRICES.tankArmor)}
                  onClick={() => handleBuyUpgrade('armor', UPGRADE_PRICES.tankArmor)}
                >
                  ${getPrice(UPGRADE_PRICES.tankArmor)}
                </button>
              )}
            </div>
          </div>

          {/* Hulls Section */}
          <div className="hulls-section">
            <h3 className="sub-title">TANK HULL CLASSIFICATION</h3>
            <div className="hull-list">
              {(Object.keys(TANK_DEFS) as TankType[]).map((type) => {
                const config = TANK_DEFS[type];
                const active = currentTank.type === type;
                
                return (
                  <div key={type} className={`hull-item ${active ? 'active-hull' : ''}`}>
                    <div className="hull-info">
                      <span className="hull-name">{config.name}</span>
                      <span className="hull-desc">{config.description}</span>
                    </div>
                    {active ? (
                      <span className="equipped-label">ACTIVE</span>
                    ) : (
                      <button
                        className="buy-btn"
                        disabled={currentTank.money < getPrice(config.cost)}
                        onClick={() => handleBuyTankHull(type, config.cost)}
                      >
                        ${getPrice(config.cost)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Services */}
          <div className="services-section">
            <h3 className="sub-title">MAINTENANCE BAY</h3>
            <div className="service-buttons">
              <button
                className="service-btn"
                disabled={currentTank.money < UPGRADE_PRICES.refillFuel || currentTank.fuel >= currentTank.maxFuel}
                onClick={() => handleService('fuel', UPGRADE_PRICES.refillFuel)}
              >
                Refill Fuel (${UPGRADE_PRICES.refillFuel})
              </button>
              <button
                className="service-btn"
                disabled={currentTank.money < UPGRADE_PRICES.refillHealth || currentTank.health >= currentTank.maxHealth}
                onClick={() => handleService('armor', UPGRADE_PRICES.refillHealth)}
              >
                Repair Chassis (${UPGRADE_PRICES.refillHealth})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="shop-footer">
        <button className="confirm-btn" onClick={handleDone}>
          {currentPlayerIdx < humanTanks.length - 1 ? 'PROCEED TO NEXT PLAYER' : 'LAUNCH NEXT ROUND'}
        </button>
      </div>
    </div>
  );
};
