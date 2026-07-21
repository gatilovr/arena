import { PLAYER, ARENA, clamp } from './constants.js';

export function forward(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

/**
 * Shared movement integration used by both server (Player) and client (LocalPlayer).
 * Mutates state in place and returns it.
 *
 * @param {Object} state  - { x, y, z, vx, vy, vz, yaw, grounded, jumpsLeft, dashing, dashT, dashDX, dashDZ }
 * @param {Object} input  - { mx, mz }
 * @param {number} dt     - delta time in seconds
 * @param {number} [speedMult=1] - multiplier on PLAYER.SPEED (server uses stats.speed)
 */
export function integrateMovement(state, input, dt, speedMult = 1) {
  const f = forward(state.yaw);
  const rx = -f.z, rz = f.x;
  let mdx = rx * input.mx + f.x * (-input.mz);
  let mdz = rz * input.mx + f.z * (-input.mz);
  const ml = Math.hypot(mdx, mdz);
  if (ml > 1) { mdx /= ml; mdz /= ml; }

  if (state.dashing) {
    state.dashT -= dt;
    if (state.dashT <= 0) state.dashing = false;
  }

  let tvx, tvz;
  if (state.dashing) {
    tvx = state.dashDX * PLAYER.DASH_SPEED;
    tvz = state.dashDZ * PLAYER.DASH_SPEED;
  } else {
    const spd = PLAYER.SPEED * speedMult;
    tvx = mdx * spd;
    tvz = mdz * spd;
  }
  const blend = Math.min(1, dt * 14);
  state.vx += (tvx - state.vx) * blend;
  state.vz += (tvz - state.vz) * blend;

  state.vy -= PLAYER.GRAVITY * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.z += state.vz * dt;

  if (state.y <= PLAYER.HEIGHT) {
    state.y = PLAYER.HEIGHT; state.vy = 0;
    if (!state.grounded) { state.grounded = true; state.jumpsLeft = 2; }
  }
  state.x = clamp(state.x, -ARENA.LIMIT, ARENA.LIMIT);
  state.z = clamp(state.z, -ARENA.LIMIT, ARENA.LIMIT);
  return state;
}
