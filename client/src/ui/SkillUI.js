import { SKILLS, SETS, RARITY, computeActiveSets } from '../../../shared/gameData.js';

// ============================================================================
// SKILLUI — управление панелью скилов, гримуаром, сет-бонусами.
// Supports click-to-select and drag-and-drop for assigning/unassigning skills.
// ============================================================================
export class SkillUI {
  constructor(net) {
    this.net = net;
    this.skillSlots = [null, null];
    this.learnedSkills = [];
    this.activeSets = [];
    this.setFlags = {};
    this._selSkill = null;
    this._isOpen = false;

    // drag state
    this._dragging = false;
    this._dragSkillId = null;
    this._dragFromSlot = -1;
    this._ghostEl = null;
    this._dragStarted = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._longPressTimer = null;
    this._longPressFired = false;

    this._bindPad();
    this._bindBook();
    this._bindDragTargets();
  }

  // --- панель скилов (HUD) ---
  _bindPad() {
    for (let i = 0; i < 2; i++) {
      const el = document.getElementById('sk' + i);
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!this.skillSlots[i]) {
          this._toast('📖 Гримуар (K) — назначь скил');
          return;
        }
      });
    }
  }

  // --- гримуар ---
  _bindBook() {
    document.getElementById('book-close').addEventListener('click', () => this.close());
  }

  // --- bind drop targets (slots) + cancel drag on book close ---
  _bindDragTargets() {
    for (let i = 0; i < 2; i++) {
      const el = document.getElementById('book-slot' + i);

      // drop target: highlight on hover while dragging from grid
      el.addEventListener('pointerover', () => { if (this._dragging && this._dragFromSlot < 0) el.classList.add('drop-target'); });
      el.addEventListener('pointerout', () => el.classList.remove('drop-target'));
      el.addEventListener('pointerup', (e) => {
        if (!this._dragging) return;
        el.classList.remove('drop-target');
        if (this._dragFromSlot < 0) {
          // dragging from grid → assign to this slot
          this._dropOnSlot(i);
        }
      });

      // drag FROM slot (to unassign): long-press or move to start drag from slot
      el.addEventListener('pointerdown', (e) => {
        if (!this.skillSlots[i]) return;
        e.preventDefault(); e.stopPropagation();
        this._startSlotDrag(i, el, e);
      });
    }
  }

  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this._render();
    document.getElementById('book-screen').classList.remove('hidden');
  }

  close() {
    this._isOpen = false;
    this._cancelDrag();
    document.getElementById('book-screen').classList.add('hidden');
  }

  get isOpen() { return this._isOpen; }

  _render() {
    this._renderSkillColl();
    this._renderSkillSlots();
    this._renderSets();
    this._renderInfo(null);
  }

  // --- skill grid cells: click = select, drag = assign ---
  _renderSkillColl() {
    const grid = document.getElementById('skill-coll');
    grid.innerHTML = '';
    if (!this.learnedSkills.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;color:#8b93b8;font-size:12px;font-weight:700;text-align:center;padding:14px">Повышай уровень — скилы появляются там.<br>Иногда страницы гримуара падают с врагов 📖</div>';
      return;
    }
    for (const id of this.learnedSkills) {
      const d = SKILLS[id];
      if (!d) continue;
      const cell = document.createElement('div');
      cell.className = 'inv-cell rar' + d.rar;
      cell.innerHTML = `<span>${d.icon}</span>`;
      cell.dataset.skillId = id;

      // pointerdown: begin tracking for tap vs drag
      cell.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this._selSkill = id;
        this._startGridDrag(id, cell, e);
      });
      grid.appendChild(cell);
    }
  }

  _renderSkillSlots() {
    for (let i = 0; i < 2; i++) {
      const id = this.skillSlots[i];
      const el = document.getElementById('book-slot' + i);
      const ico = el.querySelector('.ss-ico');
      if (id && SKILLS[id]) {
        ico.textContent = SKILLS[id].icon;
        el.className = 'sk-slot rar' + SKILLS[id].rar;
      } else {
        ico.textContent = '＋';
        el.className = 'sk-slot';
      }
      const pad = document.getElementById('sk' + i);
      pad.classList.toggle('empty', !id);
      pad.querySelector('.sk-ico').textContent = id && SKILLS[id] ? SKILLS[id].icon : '＋';
    }
  }

  _renderInfo(skillId) {
    const box = document.getElementById('book-info');
    if (!skillId) {
      box.innerHTML = '<div class="info-body"><div class="info-name" style="color:#8b93b8">Выбери скил…</div><div class="info-stats">Тап — инфо. Перетащи на слот — назначить. Перетащи из слота — снять.</div></div>';
      return;
    }
    const d = SKILLS[skillId];
    if (!d) return;
    const inSlot = this.skillSlots.indexOf(skillId);
    const setOf = SETS.find(s => s.a === skillId || s.b === skillId);
    const setInfo = setOf ? `<br>${setOf.icon} Сет «${setOf.name}»` : '';

    box.innerHTML = `
      <div class="info-ico rar${d.rar}">${d.icon}</div>
      <div class="info-body">
        <div class="info-name rc${d.rar}">${d.name} <span style="font-size:9px;color:#8b93b8">· КД ${d.cd}с</span></div>
        <div class="info-stats">${d.desc}${setInfo}</div>
      </div>
      <div class="info-btns">
        <button class="go" id="btn-to0">${inSlot === 0 ? '✓ СЛОТ 1' : 'В СЛОТ 1'}</button>
        <button class="go" id="btn-to1">${inSlot === 1 ? '✓ СЛОТ 2' : 'В СЛОТ 2'}</button>
        ${inSlot >= 0 ? '<button id="btn-unslot">СНЯТЬ</button>' : ''}
      </div>`;
    document.getElementById('btn-to0').addEventListener('click', () => this.assign(0, skillId));
    document.getElementById('btn-to1').addEventListener('click', () => this.assign(1, skillId));
    const un = document.getElementById('btn-unslot');
    if (un) un.addEventListener('click', () => this.unassign(inSlot));
  }

  _renderSets() {
    const list = document.getElementById('sets-list');
    list.innerHTML = '';
    for (const s of SETS) {
      const on = !!this.setFlags[s.id];
      const row = document.createElement('div');
      row.className = 'set-row2' + (on ? ' on' : '');
      row.innerHTML = `
        <span class="s-ico">${s.icon}</span>
        <div>
          <div class="s-name">${s.name} <span style="color:#8b93b8;font-size:9px">${SKILLS[s.a]?.icon || ''}+${SKILLS[s.b]?.icon || ''}</span></div>
          <div class="s-desc">${s.desc}</div>
        </div>
        <span class="s-state">${on ? 'АКТИВЕН' : '—'}</span>`;
      list.appendChild(row);
    }
  }

  // ==========================================================================
  //  DRAG-AND-DROP — grid cell → skill slot (assign)
  //                     skill slot → grid area (unassign)
  // ==========================================================================

  // --- drag from GRID cell (assign to slot) ---
  _startGridDrag(skillId, el, e) {
    this._dragSkillId = skillId;
    this._dragFromSlot = -1;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._dragStarted = false;
    this._longPressFired = false;

    const isTouch = e.pointerType === 'touch';
    const threshold = isTouch ? 8 : 4;

    // touch: long-press timer for drag
    if (isTouch) {
      this._longPressTimer = setTimeout(() => {
        this._longPressFired = true;
        this._beginDrag(skillId, el, e);
      }, 300);
    }

    const onMove = (ev) => {
      if (this._dragStarted) {
        this._moveGhost(ev);
        this._highlightDropTargets(ev);
        return;
      }
      const dx = ev.clientX - this._dragStartX;
      const dy = ev.clientY - this._dragStartY;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        clearTimeout(this._longPressTimer);
        this._beginDrag(skillId, el, ev);
      }
    };

    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      clearTimeout(this._longPressTimer);

      if (this._dragStarted) {
        // drop logic
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const slotEl = target?.closest('[data-skill-slot]');
        if (slotEl) {
          this._dropOnSlot(parseInt(slotEl.dataset.skillSlot, 10));
        } else {
          // dropped on grid or empty area — just select
          this._selectSkill(skillId);
        }
        this._cancelDrag();
      } else {
        // short tap — select
        this._selectSkill(skillId);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // --- drag from SLOT (unassign) ---
  _startSlotDrag(slotIdx, el, e) {
    const skillId = this.skillSlots[slotIdx];
    if (!skillId) return;
    this._dragSkillId = skillId;
    this._dragFromSlot = slotIdx;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._dragStarted = false;
    this._longPressFired = false;

    const isTouch = e.pointerType === 'touch';
    const threshold = isTouch ? 8 : 4;

    if (isTouch) {
      this._longPressTimer = setTimeout(() => {
        this._longPressFired = true;
        this._beginDrag(skillId, el, e);
      }, 300);
    }

    const onMove = (ev) => {
      if (this._dragStarted) {
        this._moveGhost(ev);
        return;
      }
      const dx = ev.clientX - this._dragStartX;
      const dy = ev.clientY - this._dragStartY;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        clearTimeout(this._longPressTimer);
        this._beginDrag(skillId, el, ev);
      }
    };

    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      clearTimeout(this._longPressTimer);

      if (this._dragStarted) {
        // dropped outside the slot → unassign
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const sameSlot = target?.closest('#book-slot' + slotIdx);
        if (!sameSlot) {
          this.unassign(slotIdx);
        }
        this._cancelDrag();
      }
      // short tap on slot: do nothing special (info already shows if slot has skill)
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // --- shared: create ghost and mark dragging ---
  _beginDrag(skillId, el, e) {
    this._dragging = true;
    this._dragStarted = true;
    this._dragSkillId = skillId;

    const d = SKILLS[skillId];
    if (!d) return;

    const ghost = document.createElement('div');
    ghost.className = 'inv-drag-ghost';
    ghost.textContent = d.icon;
    const color = RARITY[d.rar]?.color || '#fff';
    ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;font-size:32px;width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:rgba(10,13,22,.9);border:2px solid ${color};transform:translate(-50%,-50%);box-shadow:0 8px 24px rgba(0,0,0,.6);border-radius:8px;`;
    document.body.appendChild(ghost);
    this._ghostEl = ghost;
    this._moveGhost(e);
  }

  _moveGhost(e) {
    if (this._ghostEl) {
      this._ghostEl.style.left = e.clientX + 'px';
      this._ghostEl.style.top = e.clientY + 'px';
    }
  }

  _highlightDropTargets(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    if (this._dragFromSlot < 0) {
      // dragging from grid: highlight skill slots
      const slotEl = target?.closest('[data-skill-slot]');
      if (slotEl) slotEl.classList.add('drop-target');
    } else {
      // dragging from slot: could highlight grid as "drop zone" (but we don't need a highlight there)
    }
  }

  _dropOnSlot(slotIdx) {
    if (!this._dragSkillId) return;
    this.assign(slotIdx, this._dragSkillId);
    this._cancelDrag();
  }

  _cancelDrag() {
    this._dragging = false;
    this._dragStarted = false;
    this._dragSkillId = null;
    this._dragFromSlot = -1;
    clearTimeout(this._longPressTimer);
    if (this._ghostEl) { this._ghostEl.remove(); this._ghostEl = null; }
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  }

  _selectSkill(skillId) {
    this._selSkill = skillId;
    this._renderSkillColl();
    this._renderInfo(skillId);
  }

  // --- public API ---
  assign(slot, skillId) {
    this.net.send({ t: 'assign', slot, skillId });
  }

  unassign(slot) {
    this.net.send({ t: 'unassign', slot });
  }

  // --- обновление от сервера ---
  updateState(state) {
    if (state.skills) this.skillSlots = [...state.skills];
    if (state.learned) this.learnedSkills = [...state.learned];
    this._refreshSets();
    this._renderSkillSlots();
    if (this._isOpen) this._render();
  }

  _refreshSets() {
    this.activeSets = computeActiveSets(this.skillSlots);
    this.setFlags = {};
    for (const s of this.activeSets) this.setFlags[s.id] = true;
  }

  updateCooldowns(scd) {
    if (!scd) return;
    for (let i = 0; i < 2; i++) {
      const el = document.getElementById('sk' + i + '-cd');
      if (scd[i] > 0) {
        el.style.display = 'flex';
        el.textContent = Math.ceil(scd[i]);
      } else {
        el.style.display = 'none';
      }
    }
  }

  _toast(msg) {
    const el = document.getElementById('toast');
    el.innerHTML = msg; el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 2300);
  }
}
