import React, { useState, useEffect, useRef } from 'react';
import { RetroMonitor } from './components/RetroMonitor';
import { MainMenu } from './components/MainMenu';
import { Shop } from './components/Shop';
import { GameHud } from './components/GameHud';
import { Tank, Bullet, GameSettings, Arena } from './game/types';
import { ARENAS, createDefaultTank } from './game/constants';
import { updateGameFrame, arrangeTanksAtSpawns } from './game/engine';
import { CanvasRenderer } from './game/renderer';
import { sound } from './game/sound';
import './App.css';

const DEFAULT_SETTINGS: GameSettings = {
  humanPlayers: 1,
  robotCount: 3,
  roundLimit: 9,
  timeLimit: 90, // seconds
  soundEnabled: true,
  arenaId: 'zone-alpha'
};

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'round_over' | 'shop' | 'game_over'>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [roundNum, setRoundNum] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(settings.timeLimit);
  const [roundWinner, setRoundWinner] = useState<Tank | null>(null);

  // References for game loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tanksRef = useRef<Tank[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const keysPressedRef = useRef<Record<string, boolean>>({});
  const animationFrameIdRef = useRef<number | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const lastTimeRef = useRef<number>(0);
  const roundTimerIdRef = useRef<number | null>(null);

  // Start the sound system when music starts
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
    if (gameState === 'playing' || gameState === 'shop' || gameState === 'menu') {
      sound.startMusic();
    }
    return () => {
      sound.stopMusic();
    };
  }, [settings.soundEnabled, gameState]);

  // Setup keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;

      // Handle weapon changes on single keystrokes
      if (gameState === 'playing') {
        // Player 1 Weapon Cycle
        if (e.code === 'KeyE' || e.code === 'Slash') {
          cycleWeapon('p1');
        }
        // Player 2 Weapon Cycle
        if (e.code === 'KeyO' && settings.humanPlayers > 1) {
          cycleWeapon('p2');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, settings.humanPlayers]);

  const cycleWeapon = (playerId: string) => {
    const playerTank = tanksRef.current.find(t => t.id === playerId);
    if (playerTank && !playerTank.isDead) {
      let idx = playerTank.activeWeaponIndex;
      const startIdx = idx;
      do {
        idx = (idx + 1) % playerTank.weapons.length;
      } while (!playerTank.weapons[idx].unlocked && idx !== startIdx);
      playerTank.activeWeaponIndex = idx;
    }
  };

  // Setup game round simulation
  const handleStartGame = () => {
    sound.init();
    
    // Create human players
    const players: Tank[] = [
      createDefaultTank('p1', 'PLAYER 1', 'assault', '#00ffff', false)
    ];

    if (settings.humanPlayers > 1) {
      players.push(createDefaultTank('p2', 'PLAYER 2', 'scout', '#ff33ff', false));
    }

    // Add robots
    const robotNames = ['AGGRESSOR', 'GUARDIAN', 'PHANTOM', 'HUNTER', 'DEFENDER'];
    const robotBehaviors: Array<Tank['robotBehavior']> = ['aggressive', 'cautious', 'ambusher', 'sniper', 'aggressive'];
    const robotColors = ['#ff6600', '#33ff33', '#ffff33', '#cc33ff', '#ff3333'];
    const robotHulls: Array<'scout' | 'assault' | 'dreadnought'> = ['assault', 'scout', 'dreadnought', 'assault', 'dreadnought'];

    for (let i = 0; i < settings.robotCount; i++) {
      players.push(
        createDefaultTank(
          `r${i}`,
          robotNames[i % robotNames.length],
          robotHulls[i % robotHulls.length],
          robotColors[i % robotColors.length],
          true,
          robotBehaviors[i % robotBehaviors.length]
        )
      );
    }

    tanksRef.current = players;
    bulletsRef.current = [];
    setRoundNum(1);
    initializeRound(1, players);
  };

  const initializeRound = (rNum: number, currentTanks: Tank[]) => {
    const arena = ARENAS.find(a => a.id === settings.arenaId) || ARENAS[0];
    arrangeTanksAtSpawns(currentTanks, arena);
    tanksRef.current = currentTanks;
    bulletsRef.current = [];
    setTimeLeft(settings.timeLimit);
    setRoundWinner(null);
    setGameState('playing');

    // Reset loop timer refs
    lastTimeRef.current = performance.now();

    // Start timer interval
    if (roundTimerIdRef.current) clearInterval(roundTimerIdRef.current);
    roundTimerIdRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(roundTimerIdRef.current!);
          endRound(null, 'TIME EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Main game update loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new CanvasRenderer(ctx);
    const arena = ARENAS.find(a => a.id === settings.arenaId) || ARENAS[0];

    const gameLoop = (timestamp: number) => {
      const result = updateGameFrame(
        tanksRef.current,
        bulletsRef.current,
        arena,
        keysPressedRef.current,
        settings,
        timestamp
      );

      tanksRef.current = result.tanks;
      bulletsRef.current = result.bullets;

      // Handle custom particle spawns
      result.particleSpawns.forEach((p) => {
        if (rendererRef.current) {
          if (p.speed > 3) {
            rendererRef.current.addExplosionParticles(p.x, p.y, p.color, 20);
          } else {
            // Smaller sparks
            rendererRef.current.addExplosionParticles(p.x, p.y, p.color, 4);
          }
        }
      });

      // Spawn thruster trails for moving tanks
      tanksRef.current.forEach(tank => {
        if (!tank.isDead && (Math.abs(tank.vx) > 0.5 || Math.abs(tank.vy) > 0.5)) {
          if (Math.random() < 0.3 && rendererRef.current) {
            rendererRef.current.addThrusterParticles(tank.x, tank.y, tank.angle, tank.color);
          }
        }
        
        // Spawn charging sparkles
        const insideChargeZone = arena.chargingZones.some(zone => {
          const dx = tank.x - zone.x;
          const dy = tank.y - zone.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < zone.radius + 18 - 5) {
            if (Math.random() < 0.15 && rendererRef.current) {
              rendererRef.current.addChargeParticles(tank.x, tank.y, zone.x, zone.y, '#00ffff');
            }
            return true;
          }
          return false;
        });
      });

      // Render all
      if (rendererRef.current) {
        rendererRef.current.render(tanksRef.current, bulletsRef.current, arena, timestamp);
      }

      // Check win condition: how many tanks are left alive?
      const aliveTanks = tanksRef.current.filter(t => !t.isDead);
      if (aliveTanks.length === 1) {
        // We have a winner!
        endRound(aliveTanks[0], 'DESTRUCTION SUCCESS');
      } else if (aliveTanks.length === 0) {
        // Mutual destruction
        endRound(null, 'MUTUAL ANNIHILATION');
      } else {
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState, settings]);

  const endRound = (winner: Tank | null, cause: string) => {
    if (roundTimerIdRef.current) {
      clearInterval(roundTimerIdRef.current);
      roundTimerIdRef.current = null;
    }

    sound.playExplosion();
    setRoundWinner(winner);
    setGameState('round_over');

    // Reward winner
    if (winner) {
      winner.score += 200;
      winner.money += 120;
    }

    // Award cash to all other alive/active players based on survival/performance
    tanksRef.current.forEach((tank) => {
      if (!tank.isDead) {
        tank.money += 50; // Survival bonus
      } else {
        tank.money += 20; // Consolation credits
      }
    });
  };

  const handleNextRound = () => {
    if (roundNum >= settings.roundLimit) {
      setGameState('game_over');
    } else {
      const nextR = roundNum + 1;
      setRoundNum(nextR);
      
      // Every 3 rounds we visit the Shop.
      if (nextR === 4 || nextR === 7 || nextR === 10) {
        setGameState('shop');
      } else {
        initializeRound(nextR, tanksRef.current);
      }
    }
  };

  const handleFinishShopping = (updatedTanks: Tank[]) => {
    tanksRef.current = updatedTanks;
    initializeRound(roundNum, updatedTanks);
  };

  const handleQuit = () => {
    if (roundTimerIdRef.current) clearInterval(roundTimerIdRef.current);
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    setGameState('menu');
  };

  // Determine overall champion
  const getOverallWinner = () => {
    let champion = tanksRef.current[0];
    tanksRef.current.forEach(t => {
      if (t.score > champion.score) {
        champion = t;
      }
    });
    return champion;
  };

  const arenaDef = ARENAS.find(a => a.id === settings.arenaId) || ARENAS[0];

  return (
    <RetroMonitor>
      {gameState === 'menu' && (
        <MainMenu
          settings={settings}
          onChangeSettings={setSettings}
          onStartGame={handleStartGame}
        />
      )}

      {gameState === 'playing' && (
        <div className="game-screen">
          <canvas
            ref={canvasRef}
            width={arenaDef.width}
            height={arenaDef.height}
            className="game-canvas"
          />
          <GameHud
            tanks={tanksRef.current}
            roundNum={roundNum}
            timeLeft={timeLeft}
            settings={settings}
            onQuit={handleQuit}
          />
        </div>
      )}

      {gameState === 'round_over' && (
        <div className="overlay-screen">
          <h2 className="overlay-title glowing-red">ROUND COMPLETE</h2>
          
          <div className="overlay-content">
            {roundWinner ? (
              <div>
                <p className="winner-announcement" style={{ color: roundWinner.color }}>
                  {roundWinner.name} WINS THE COMBAT!
                </p>
                <p className="reward-text">+200 PTS | +$120 CREDITS AWARDED</p>
              </div>
            ) : (
              <p className="winner-announcement text-orange">MUTUAL ANNIHILATION</p>
            )}
            
            <table className="scoreboard">
              <thead>
                <tr>
                  <th>CLASSIFICATION</th>
                  <th>SCORE</th>
                  <th>CREDITS</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {tanksRef.current.map((tank) => (
                  <tr key={tank.id} style={{ color: tank.color }}>
                    <td>{tank.name}</td>
                    <td>{tank.score}</td>
                    <td>${tank.money}</td>
                    <td>{tank.isDead ? 'DESTROYED' : 'SURVIVED'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="menu-btn continue-btn" onClick={handleNextRound}>
            {roundNum >= settings.roundLimit ? 'PROCEED TO FINAL STANDINGS' : 'PROCEED'}
          </button>
        </div>
      )}

      {gameState === 'shop' && (
        <Shop
          tanks={tanksRef.current}
          humanPlayersCount={settings.humanPlayers}
          onFinishShopping={handleFinishShopping}
        />
      )}

      {gameState === 'game_over' && (
        <div className="overlay-screen">
          <h2 className="overlay-title glowing-cyan">SIMULATION OVER</h2>
          
          <div className="overlay-content">
            <p className="champion-announcement" style={{ color: getOverallWinner()?.color }}>
              CHAMPION: {getOverallWinner()?.name}
            </p>
            <p className="final-score">FINAL SCORE: {getOverallWinner()?.score} PTS</p>
            
            <table className="scoreboard">
              <thead>
                <tr>
                  <th>PILOT</th>
                  <th>SCORE</th>
                  <th>CREDITS</th>
                  <th>HULL TYPE</th>
                </tr>
              </thead>
              <tbody>
                {tanksRef.current.map((tank) => (
                  <tr key={tank.id} style={{ color: tank.color }}>
                    <td>{tank.name}</td>
                    <td>{tank.score}</td>
                    <td>${tank.money}</td>
                    <td>{tank.type.toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="menu-btn continue-btn" onClick={handleQuit}>
            RETURN TO COMMAND MENU
          </button>
        </div>
      )}
  );
};

export default App;

