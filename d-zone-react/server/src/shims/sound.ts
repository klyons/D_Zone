// No-op sound module for server-side use (sound is client-only)
export const sound = {
  init() {},
  setEnabled(_v: boolean) {},
  startMusic() {},
  stopMusic() {},
  playLaser() {},
  playPlasma() {},
  playHit() {},
  playExplosion() {},
  playCharge() {},
  playShield() {},
  playTeleport() {},
};
