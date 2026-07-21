// ============================================================================
// UPGRADEUI — экран выбора улучшения при левел-апе.
// ============================================================================
import { C } from '../../../shared/protocol.js';

export class UpgradeUI {
  constructor(net) {
    this.net = net;
    this.screen = document.getElementById('upgrade-screen');
    this.cardsEl = document.getElementById('upgrade-cards');
    this.levelEl = document.getElementById('upgrade-level');
    this.open = false;
  }

  show(options, level) {
    this.open = true;
    this.levelEl.textContent = 'УРОВЕНЬ ' + level + '!';
    this.cardsEl.innerHTML = '';
    for (const opt of options) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-icon">${opt.icon}</div>
        <div class="upgrade-name">${opt.name}</div>
        <div class="upgrade-desc">${opt.desc}</div>
      `;
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.net.send({ t: C.UPGRADE, choice: opt.id });
        this.close();
      });
      this.cardsEl.appendChild(card);
    }
    this.screen.classList.remove('hidden');
  }

  close() {
    this.open = false;
    this.screen.classList.add('hidden');
  }
}
