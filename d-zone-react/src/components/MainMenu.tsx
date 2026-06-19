import React from 'react';
import { GameSettings, Arena } from '../game/types';
import { ARENAS } from '../game/constants';
import './MainMenu.css';

interface MainMenuProps {
  settings: GameSettings;
  onChangeSettings: (settings: GameSettings) => void;
  onStartGame: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  settings,
  onChangeSettings,
  onStartGame
}) => {
  const handlePlayerChange = (val: number) => {
    onChangeSettings({ ...settings, humanPlayers: val });
  };

  const handleRobotChange = (val: number) => {
    onChangeSettings({ ...settings, robotCount: val });
  };

  const handleArenaChange = (id: string) => {
    onChangeSettings({ ...settings, arenaId: id });
  };

  const toggleSound = () => {
    onChangeSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  return (
    <div className="main-menu-container">
      <div className="menu-header">
        <h1 className="glowing-title">D-ZONE</h1>
        <p className="subtitle">DESTRUCTION ZONE - 1990S TANK CLONE</p>
      </div>

      <div className="menu-body">
        {/* Settings column */}
        <div className="menu-column settings-panel">
          <h2 className="section-title">COMBAT OPTIONS</h2>

          <div className="setting-row">
            <span className="setting-label">HUMAN PLAYERS:</span>
            <div className="btn-group">
              <button
                className={`menu-btn ${settings.humanPlayers === 1 ? 'active' : ''}`}
                onClick={() => handlePlayerChange(1)}
              >
                1 PLAYER
              </button>
              <button
                className={`menu-btn ${settings.humanPlayers === 2 ? 'active' : ''}`}
                onClick={() => handlePlayerChange(2)}
              >
                2 PLAYERS
              </button>
            </div>
          </div>

          <div className="setting-row">
            <span className="setting-label">ROBOT COMBATANTS:</span>
            <div className="btn-group">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  className={`menu-btn btn-small ${settings.robotCount === num ? 'active' : ''}`}
                  onClick={() => handleRobotChange(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <span className="setting-label">TACTICAL ARENA:</span>
            <select
              className="menu-select"
              value={settings.arenaId}
              onChange={(e) => handleArenaChange(e.target.value)}
            >
              {ARENAS.map((arena) => (
                <option key={arena.id} value={arena.id}>
                  {arena.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-row">
            <span className="setting-label">SOUND EFFECTS:</span>
            <button
              className={`menu-btn ${settings.soundEnabled ? 'active' : 'inactive-btn'}`}
              onClick={toggleSound}
            >
              {settings.soundEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <button className="start-btn" onClick={onStartGame}>
            INITIALIZE SIMULATION
          </button>
        </div>

        {/* Controls / Info column */}
        <div className="menu-column info-panel">
          <h2 className="section-title">FLIGHT MANUAL</h2>
          
          <div className="manual-section">
            <h3>OBJECTIVE</h3>
            <p>
              Destroy all other tanks. If your tank runs out of energy or weapon fuel (visualized by the cylinders on the back of your tank), retreat to any of the 4 glowing corner <strong>Light Absorbers</strong> to recharge.
            </p>
          </div>

          <div className="manual-section">
            <h3>CONTROLS</h3>
            <div className="control-split">
              <div className="control-block">
                <h4 className="p1-color">PLAYER 1</h4>
                <ul>
                  <li><strong>Move/Turn:</strong> ARROW Keys or WASD</li>
                  <li><strong>Fire Weapon:</strong> SPACE or Left SHIFT</li>
                  <li><strong>Cycle Weapon:</strong> E key or SLASH (/)</li>
                  <li><strong>Activate Tool:</strong> Q key or PERIOD (.)</li>
                </ul>
              </div>
              
              {settings.humanPlayers > 1 && (
                <div className="control-block">
                  <h4 className="p2-color">PLAYER 2</h4>
                  <ul>
                    <li><strong>Move/Turn:</strong> I / K / J / L keys</li>
                    <li><strong>Fire Weapon:</strong> F key or H key</li>
                    <li><strong>Cycle Weapon:</strong> O key</li>
                    <li><strong>Activate Tool:</strong> U key</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
