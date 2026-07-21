// ============================================================================
// PAUSEUI — экран паузы: ESC / кнопка паузы.
// Пауза клиентская — сервер продолжает работать для других игроков.
// ============================================================================
export class PauseUI {
  constructor(game) {
    this.game = game;
    this._isOpen = false;
    this._wasInventoryOpen = false;
    this._wasBookOpen = false;
    this._bind();
  }

  _bind() {
    document.getElementById('pause-resume').addEventListener('click', () => this.close());
    document.getElementById('pause-settings').addEventListener('click', () => {
      this.close();
      this.game.settingsUI.open();
    });
    document.getElementById('pause-inventory').addEventListener('click', () => {
      this.close();
      this.game.invUI.open();
    });
    document.getElementById('pause-grimoire').addEventListener('click', () => {
      this.close();
      this.game.skillUI.open();
    });
    document.getElementById('pause-leave').addEventListener('click', () => {
      this.close();
      this.game.leaveGame();
    });
  }

  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this.game.paused = true;
    // remember overlay states
    this._wasInventoryOpen = this.game.invUI.isOpen;
    this._wasBookOpen = this.game.skillUI.isOpen;
    if (this._wasInventoryOpen) this.game.invUI.close();
    if (this._wasBookOpen) this.game.skillUI.close();
    document.getElementById('pause-screen').classList.remove('hidden');
  }

  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.game.paused = false;
    document.getElementById('pause-screen').classList.add('hidden');
    // restore overlay states
    if (this._wasInventoryOpen) this.game.invUI.open();
    if (this._wasBookOpen) this.game.skillUI.open();
    this._wasInventoryOpen = false;
    this._wasBookOpen = false;
  }

  toggle() {
    if (this._isOpen) this.close();
    else this.open();
  }

  get isOpen() { return this._isOpen; }
}
