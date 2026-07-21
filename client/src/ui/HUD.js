// ============================================================================
// HUD — обновление интерфейса во время боя: счёт, волны, HP, команда, анонсы,
// радар (миникарта), HP-бар босса.
// ============================================================================
export class HUD {
  constructor() {
    this.cache = {};
    this.teamCards = new Map(); // id → {el, hp}
    this.dmgT = 0;

    // radar
    this.radarEl = document.getElementById('radar');
    this.radarCtx = this.radarEl ? this.radarEl.getContext('2d') : null;
  }

  _txt(id, v) {
    if (this.cache[id] !== v) { this.cache[id] = v; document.getElementById(id).textContent = v; }
  }
  _w(id, v) {
    const k = id + '_w';
    if (this.cache[k] !== v) { this.cache[k] = v; document.getElementById(id).style.width = v + '%'; }
  }

  update(me, wave, players) {
    if (!me) return;
    this._txt('score-val', String(me.score));
    this._txt('kills-val', '☠ ' + me.kills);
    this._txt('lvl-val', 'УР ' + me.level);
    this._txt('wave-num', wave.boss ? '⚠ БОСС' : 'ВОЛНА ' + wave.num);
    this._txt('wave-left', 'врагов: ' + wave.left);
    this._w('hp-fill', Math.max(0, Math.min(100, me.hp / me.mhp * 100)));
    this._w('xp-fill', Math.max(0, Math.min(100, me.xp / me.xpn * 100)));
    this._txt('hp-text', me.hp + ' / ' + me.mhp);

    // ульта-бар
    if (me.ult !== undefined) {
      this._w('ult-fill', Math.max(0, Math.min(100, me.ult)));
      const full = me.ult >= 100;
      document.getElementById('btn-ult')?.classList.toggle('ready', full);
      document.getElementById('ult-label')?.classList.toggle('full', full);
      this._txt('ult-label', full ? 'ГОТОВО!' : 'УЛЬТА');
    }

    // комбо
    const cb = document.getElementById('combo-box');
    if (me.combo >= 2) {
      cb.classList.add('active');
      this._txt('combo-text', 'СЕРИЯ x' + me.combo);
      this._txt('combo-multi', '+' + Math.min(me.combo, 25) * 4 + '% урона');
    } else cb.classList.remove('active');

    // респавн
    const ro = document.getElementById('respawn-overlay');
    if (!me.alive) {
      ro.classList.remove('hidden');
      this._txt('respawn-t', String(me.rt || 5));
    } else ro.classList.add('hidden');

    // команда
    this._updateTeam(players);
  }

  _updateTeam(players) {
    const box = document.getElementById('team-box');
    const seen = new Set();
    for (const p of players) {
      seen.add(p.id);
      let card = this.teamCards.get(p.id);
      if (!card) {
        const el = document.createElement('div');
        el.className = 'team-card';
        el.innerHTML = `<span class="team-dot"></span><span class="team-name"></span><span class="team-hp"><i></i></span>`;
        el.querySelector('.team-dot').style.background = '#' + p.c.toString(16).padStart(6, '0');
        el.querySelector('.team-name').textContent = p.n;
        box.appendChild(el);
        card = { el, hp: el.querySelector('.team-hp i') };
        this.teamCards.set(p.id, card);
      }
      card.hp.style.width = Math.max(0, p.hp / p.mhp * 100) + '%';
      card.el.classList.toggle('dead', !p.alive);
    }
    for (const [id, card] of this.teamCards) {
      if (!seen.has(id)) { card.el.remove(); this.teamCards.delete(id); }
    }
  }

  announce(text, color) {
    const el = document.getElementById('announce');
    el.textContent = text;
    el.style.color = color || '#ffc233';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  banner(main, sub, boss) {
    document.getElementById('banner-main').textContent = main;
    document.getElementById('banner-sub').textContent = sub || '';
    const el = document.getElementById('wave-banner');
    el.classList.toggle('boss', !!boss);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  damageFlash() { this.dmgT = 0.22; const el = document.getElementById('dmg-overlay'); el.classList.remove('active'); void el.offsetWidth; el.classList.add('active'); }

  // --- RADAR (миникарта) ---
  drawRadar(mePos, meYaw, enemies, drops, allies) {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const W = 96, H = 96, R = 44, CX = 48, CY = 48;
    const RANGE = 50; // world units visible on radar

    ctx.clearRect(0, 0, W, H);

    // тёмный фон
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,8,16,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // направление игрока (жёлтая линия)
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(-meYaw);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(4, 8);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    const toRadar = (wx, wz) => {
      const dx = (wx - mePos.x) / RANGE;
      const dz = (wz - mePos.z) / RANGE;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 1) return null;
      return { x: CX + dx * R, y: CY + dz * R };
    };

    // дропы (золотые точки)
    for (const d of drops) {
      const p = toRadar(d.x, d.z);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffc233';
      ctx.fill();
    }

    // враги (красные точки)
    for (const e of enemies) {
      const p = toRadar(e.x, e.z);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, e.boss ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = e.boss ? '#ff4d3d' : '#e03040';
      ctx.fill();
    }

    // союзники (цветные точки)
    if (allies) {
      for (const a of allies) {
        const p = toRadar(a.x, a.z);
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#' + a.c.toString(16).padStart(6, '0');
        ctx.fill();
      }
    }
  }

  // --- BOSS HP BAR ---
  updateBossBar(boss) {
    const el = document.getElementById('boss-bar');
    if (!boss) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    this._txt('boss-name', (boss.type === 'necro' ? 'НЕКРОМАНТ' : 'МЯСНИК') + ' ⚠');
    this._w('boss-fill', Math.max(0, Math.min(100, boss.hp / boss.mhp * 100)));
  }

  tick(dt) {
    if (this.dmgT > 0) {
      this.dmgT -= dt;
      document.getElementById('dmg-overlay').style.opacity = Math.max(0, this.dmgT / 0.22) * 0.9;
    }
  }

  reset() {
    this.cache = {};
    for (const [, card] of this.teamCards) card.el.remove();
    this.teamCards.clear();
    this.updatePing(0);
  }

  updatePing(ping) {
    const el = document.getElementById('ping-display');
    if (!el) return;
    if (ping <= 0) { el.textContent = '--ms'; el.className = ''; return; }
    el.textContent = ping + 'ms';
    el.className = ping < 50 ? 'ping-good' : ping < 100 ? 'ping-ok' : 'ping-bad';
  }

  updateBuffs(buffs) {
    const bar = document.getElementById('buff-bar');
    if (!bar) return;
    bar.innerHTML = '';
    if (!buffs || !buffs.length) return;
    for (const b of buffs) {
      const el = document.createElement('div');
      el.className = 'buff-chip';
      const name = b.name || b.type || '??';
      const durText = b.dur > 0 ? Math.ceil(b.dur) + 'с' : '';
      el.title = name + ': ' + durText;
      const iconSpan = document.createElement('span');
      iconSpan.className = 'buff-chip-icon';
      iconSpan.textContent = b.icon || '?';
      const durSpan = document.createElement('span');
      durSpan.className = 'buff-chip-dur';
      durSpan.textContent = durText;
      el.appendChild(iconSpan);
      el.appendChild(durSpan);
      if (b.color) el.style.borderColor = b.color;
      bar.appendChild(el);
    }
  }

  updateFPS(fps) {
    const el = document.getElementById('fps-display');
    if (el) el.textContent = fps + ' FPS';
  }

  toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
}
