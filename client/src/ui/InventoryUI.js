import { ITEMS, RARITY, itemStatLines } from '../../../shared/gameData.js';

// ============================================================================
// INVENTORYUI — инвентарь, экипировка, продажа предметов.
// Клик = выделение (показ инфо). Drag-and-drop = экипировка/продажа.
// ============================================================================
export class InventoryUI {
  constructor(net, sfx) {
    this.net = net;
    this.sfx = sfx;
    this.inv = [];
    this.equip = { weapon: null, relic1: null, relic2: null };
    this.selItem = -1;
    this._isOpen = false;
    this._playerStats = null;

    // drag state
    this._dragging = false;
    this._dragIdx = -1;
    this._dragEl = null;
    this._ghostEl = null;

    // store handlers for cleanup
    this._boundHandlers = [];

    this._bind();
  }

  destroy() {
    for (const [el, fn, type] of this._boundHandlers) {
      el.removeEventListener(type, fn);
    }
    this._boundHandlers = [];
    this._cancelDrag();
  }

  _bind() {
    const closeHandler = () => this.close();
    document.getElementById('inv-close').addEventListener('click', closeHandler);
    this._boundHandlers.push([document.getElementById('inv-close'), closeHandler, 'click']);

    // слоты экипировки — клик = снять предмет
    for (const slot of ['weapon', 'relic1', 'relic2']) {
      const el = document.getElementById('slot-' + slot);

      const onPointerDown = (e) => {
        if (this.equip[slot]) {
          this.net.send({ t: 'unequip', slot });
          this.sfx.equip();
        }
      };
      const onPointerOver = () => { if (this._dragging) el.classList.add('drop-target'); };
      const onPointerOut = () => el.classList.remove('drop-target');
      const onPointerUp = (e) => {
        if (!this._dragging) return;
        el.classList.remove('drop-target');
        this._dropOnSlot(slot);
      };

      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointerover', onPointerOver);
      el.addEventListener('pointerout', onPointerOut);
      el.addEventListener('pointerup', onPointerUp);

      this._boundHandlers.push([el, onPointerDown, 'pointerdown']);
      this._boundHandlers.push([el, onPointerOver, 'pointerover']);
      this._boundHandlers.push([el, onPointerOut, 'pointerout']);
      this._boundHandlers.push([el, onPointerUp, 'pointerup']);
    }

    // корзина — продать
    const trash = document.getElementById('trash-zone');
    const onTrashOver = () => { if (this._dragging) trash.classList.add('drop-target'); };
    const onTrashOut = () => trash.classList.remove('drop-target');
    const onTrashUp = () => {
      if (!this._dragging) return;
      trash.classList.remove('drop-target');
      this._dropOnTrash();
    };
    const onTrashClick = () => {
      if (!this._dragging && this.selItem >= 0 && this.selItem < this.inv.length) {
        this.net.send({ t: 'sell', invIdx: this.selItem });
        this.sfx.coin();
        this.selItem = -1;
        this._render();
      }
    };

    trash.addEventListener('pointerover', onTrashOver);
    trash.addEventListener('pointerout', onTrashOut);
    trash.addEventListener('pointerup', onTrashUp);
    trash.addEventListener('click', onTrashClick);

    this._boundHandlers.push([trash, onTrashOver, 'pointerover']);
    this._boundHandlers.push([trash, onTrashOut, 'pointerout']);
    this._boundHandlers.push([trash, onTrashUp, 'pointerup']);
    this._boundHandlers.push([trash, onTrashClick, 'click']);
  }

  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this.selItem = -1;
    this._render();
    document.getElementById('inv-screen').classList.remove('hidden');
  }

  close() {
    this._isOpen = false;
    this._cancelDrag();
    document.getElementById('inv-screen').classList.add('hidden');
  }

  get isOpen() { return this._isOpen; }

  _render() {
    this._renderGrid();
    this._renderEquipSlots();
    this._renderInfo();
    this._renderStats();
  }

  _renderGrid() {
    const grid = document.getElementById('inv-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const cell = document.createElement('div');
      cell.className = 'inv-cell';
      const id = this.inv[i];
      if (id) {
        const d = ITEMS[id];
        if (d) {
          cell.classList.add('rar' + d.rar);
          cell.innerHTML = `<span>${d.icon}</span>`;
        }
        if (i === this.selItem) cell.classList.add('sel');

        // клик = выделение (не экипировка!)
        cell.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          this.selItem = i;
          this._render();
          // начинаем drag
          this._startDrag(i, cell, e);
        });
      }
      grid.appendChild(cell);
    }
  }

  // --- drag-and-drop ---
  _startDrag(idx, el, e) {
    const id = this.inv[idx];
    if (!id) return;
    const d = ITEMS[id];
    if (!d) return;

    this._dragging = true;
    this._dragIdx = idx;

    // создаём ghost-элемент
    const ghost = document.createElement('div');
    ghost.className = 'inv-drag-ghost';
    ghost.textContent = d.icon;
    ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;font-size:32px;width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:rgba(10,13,22,.9);border:2px solid ${RARITY[d.rar]?.color || '#fff'};transform:translate(-50%,-50%);box-shadow:0 8px 24px rgba(0,0,0,.6);border-radius:8px;`;
    document.body.appendChild(ghost);
    this._ghostEl = ghost;
    this._dragEl = el;
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';

    const onMove = (ev) => {
      if (!this._dragging) return;
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top = ev.clientY + 'px';
    };
    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      // проверяем drop-target
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const slotEl = target?.closest('[data-equip-slot]');
      const trashEl = target?.closest('#trash-zone');
      if (slotEl) {
        this._dropOnSlot(slotEl.dataset.equipSlot);
      } else if (trashEl) {
        this._dropOnTrash();
      }
      this._cancelDrag();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  _cancelDrag() {
    this._dragging = false;
    this._dragIdx = -1;
    this._dragEl = null;
    if (this._ghostEl) { this._ghostEl.remove(); this._ghostEl = null; }
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  }

  _dropOnSlot(slot) {
    if (this._dragIdx < 0) return;
    const id = this.inv[this._dragIdx];
    if (!id) return;
    const d = ITEMS[id];
    if (!d) return;
    // проверяем совместимость слота
    if (slot === 'weapon' && d.slot !== 'weapon') return;
    if ((slot === 'relic1' || slot === 'relic2') && d.slot !== 'relic') return;
    this.net.send({ t: 'equip', invIdx: this._dragIdx, slot });
    this.sfx.equip();
    this.selItem = -1;
    this._cancelDrag();
  }

  _dropOnTrash() {
    if (this._dragIdx < 0) return;
    this.net.send({ t: 'sell', invIdx: this._dragIdx });
    this.sfx.coin();
    this.selItem = -1;
    this._cancelDrag();
    this._render();
  }

  _renderEquipSlots() {
    for (const slot of ['weapon', 'relic1', 'relic2']) {
      const el = document.getElementById('slot-' + slot);
      el.dataset.equipSlot = slot;
      const id = this.equip[slot];
      const ico = el.querySelector('.eq-ico');
      const nm = el.querySelector('.eq-name');
      if (id) {
        const d = ITEMS[id];
        if (d) {
          el.className = 'equip-slot rar' + d.rar;
          ico.textContent = d.icon;
          nm.innerHTML = `<span class="rc${d.rar}">${d.name}</span>`;
        }
      } else {
        el.className = 'equip-slot';
        ico.textContent = slot === 'weapon' ? '🗡️' : '🔮';
        nm.textContent = '—';
      }
    }
  }

  _renderInfo() {
    const box = document.getElementById('inv-info');
    const id = this.selItem >= 0 ? this.inv[this.selItem] : null;
    if (!id) {
      box.innerHTML = '<div class="info-body"><div class="info-name" style="color:#8b93b8">Выбери предмет…</div><div class="info-stats">Тап — выделить. Перетащи на слот — надеть. Перетащи в корзину — продать.</div></div>';
      return;
    }
    const d = ITEMS[id];
    if (!d) return;
    const stats = itemStatLines(id);
    box.innerHTML = `
      <div class="info-ico rar${d.rar}">${d.icon}</div>
      <div class="info-body">
        <div class="info-name rc${d.rar}">${d.name} <span style="font-size:9px;letter-spacing:2px">· ${RARITY[d.rar]?.name || ''}</span></div>
        <div class="info-stats">${stats.join('<br>')}</div>
      </div>
      <div class="info-btns">
        <button class="go" id="btn-equip">НАДЕТЬ</button>
        <button id="btn-sell-info">💰 ${d.val}</button>
      </div>`;
    document.getElementById('btn-equip').addEventListener('click', () => {
      const it = ITEMS[this.inv[this.selItem]];
      if (it) {
        const slot = it.slot === 'weapon' ? 'weapon' : (this.equip.relic1 ? 'relic2' : 'relic1');
        this.net.send({ t: 'equip', invIdx: this.selItem, slot });
        this.sfx.equip();
      }
    });
    document.getElementById('btn-sell-info').addEventListener('click', () => {
      this.net.send({ t: 'sell', invIdx: this.selItem });
      this.sfx.coin();
      this.selItem = -1;
      this._render();
    });
  }

  updateStats(playerSnap, playerSnaps) {
    if (!playerSnap) return;
    const meleeDmg = playerSnap.meleeDmg != null ? playerSnap.meleeDmg.toFixed(2) : '—';
    const hp = playerSnap.hp ?? '—';
    const mhp = playerSnap.mhp ?? '—';
    const totalCrit = playerSnap.crit != null ? Math.round(playerSnap.crit * 100) : 0;
    const totalSpd = playerSnap.spd != null ? Math.round(playerSnap.spd * 100) : 100;
    const totalVamp = playerSnap.vamp != null ? Math.round(playerSnap.vamp * 100) : 0;
    this._playerStats = { meleeDmg, hp, mhp, crit: totalCrit, spd: totalSpd, vamp: totalVamp };
    if (this._isOpen) this._renderStats();
  }

  _renderStats() {
    const box = document.getElementById('inv-stats');
    if (this._playerStats) {
      const s = this._playerStats;
      box.innerHTML = `<span>⚔️ Урон <b>×${s.meleeDmg}</b></span><span>❤️ HP <b>${s.hp} / ${s.mhp}</b></span><span>🎯 Крит <b>${s.crit}%</b></span><span>💨 Скорость <b>${s.spd}%</b></span><span>🧛 Вампиризм <b>${s.vamp}%</b></span>`;
    } else {
      box.innerHTML = '<span>⚔️ Урон <b>—</b></span><span>❤️ HP <b>— / —</b></span><span>🎯 Крит <b>—</b></span><span>💨 Скорость <b>—</b></span><span>🧛 Вампиризм <b>—</b></span>';
    }
  }

  // --- обновление от сервера ---
  updateState(state) {
    if (state.inv) this.inv = [...state.inv];
    if (state.equip) this.equip = { ...state.equip };
    if (this._isOpen) this._render();
  }
}
