import React from 'react';
import { Tank, GameSettings } from '../game/types';
import './GameHud.css';

interface GameHudProps {
  tanks: Tank[];
  roundNum: number;
  timeLeft: number;
  settings: GameSettings;
  onQuit: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  tanks,
  roundNum,
  timeLeft,
  settings,
  onQuit
}) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const humanTanks = tanks.filter(t => !t.isRobot).slice(0, settings.humanPlayers);
  const aliveRobots = tanks.filter(t => t.isRobot && !t.isDead).length;

  return (
    <div className="hud-container">
      {/* Top bar: Time, Round, Options */}
      <div className="hud-top-bar">
        <div className="hud-info-box">
          <span className="hud-label">ROUND</span>
          <span className="hud-value text-orange">{roundNum}</span>
        </div>
        
        <div className="hud-info-box">
          <span className="hud-label">TIME REMAINING</span>
          <span className={`hud-value ${timeLeft < 15 ? 'text-red blinking' : 'text-cyan'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="hud-info-box">
          <span className="hud-label">ROBOTS ALIVE</span>
          <span className="hud-value text-green">{aliveRobots}</span>
        </div>

        <button className="hud-quit-btn" onClick={onQuit}>
          ABORT COMBAT
        </button>
      </div>

      {/* Bottom bar: Player Vitals (split view for local multiplayers) */}
      <div className="hud-bottom-bar">
        {humanTanks.map((tank, idx) => {
          const activeWeapon = tank.weapons[tank.activeWeaponIndex];
          const activeTool = tank.tools.find(t => t.unlocked);
          const healthPct = (tank.health / tank.maxHealth) * 100;
          const fuelPct = (tank.fuel / tank.maxFuel) * 100;

          return (
            <div
              key={tank.id}
              className={`player-vitals-card ${tank.isDead ? 'vitals-dead' : ''}`}
              style={{ borderColor: tank.color }}
            >
              <div className="vitals-header" style={{ color: tank.color }}>
                <span className="player-name">{tank.name}</span>
                <span className="player-stats">
                  SCORE: {tank.score} | ${tank.money}
                </span>
              </div>

              {tank.isDead ? (
                <div className="vitals-dead-banner">TANK DESTROYED</div>
              ) : (
                <div className="vitals-bars">
                  {/* Health Bar */}
                  <div className="vitals-row">
                    <span className="bar-label">ARMOR:</span>
                    <div className="bar-outer">
                      <div
                        className="bar-inner health-fill"
                        style={{ width: `${healthPct}%` }}
                      ></div>
                    </div>
                    <span className="bar-number">{Math.round(tank.health)}/{tank.maxHealth}</span>
                  </div>

                  {/* Fuel Bar */}
                  <div className="vitals-row">
                    <span className="bar-label">FUEL:</span>
                    <div className="bar-outer">
                      <div
                        className="bar-inner fuel-fill"
                        style={{ width: `${fuelPct}%`, backgroundColor: tank.color }}
                      ></div>
                    </div>
                    <span className="bar-number">{Math.round(tank.fuel)}/{tank.maxFuel}</span>
                  </div>

                  {/* Weaponry status */}
                  <div className="vitals-gear">
                    <div className="gear-item">
                      <span className="gear-label">WEAPON:</span>
                      <span className="gear-value" style={{ color: activeWeapon?.color || '#ffffff' }}>
                        {activeWeapon?.name || 'NONE'}
                      </span>
                    </div>

                    <div className="gear-item">
                      <span className="gear-label">AUX TOOL:</span>
                      <span className="gear-value text-purple">
                        {activeTool?.name || 'NONE'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
