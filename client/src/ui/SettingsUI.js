// ============================================================================
// SETTINGSUI — экран настроек: чувствительность камеры, звук, качество, сброс.
// Все настройки хранятся в localStorage под ключом 'arena_settings'.
// ============================================================================
const STORAGE_KEY = 'arena_settings';

const DEFAULTS = {
  sensitivity: 1.0,
  sound: true,
  quality: 'high',
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function save(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

export class SettingsUI {
  constructor(onBack) {
    this.onBack = onBack;
    this._isOpen = false;
    this.settings = load();
    this._bind();
  }

  get sensitivity() { return this.settings.sensitivity; }
  get soundEnabled() { return this.settings.sound; }
  get quality() { return this.settings.quality; }
  get pixelRatio() { return this.quality === 'high' ? Math.min(devicePixelRatio, 2) : 1; }

  _bind() {
    document.getElementById('settings-close').addEventListener('click', () => this.close());
    document.getElementById('settings-back').addEventListener('click', () => this.close());

    // sensitivity slider
    const sensSlider = document.getElementById('settings-sensitivity');
    const sensVal = document.getElementById('settings-sens-val');
    sensSlider.value = this.settings.sensitivity;
    sensVal.textContent = this.settings.sensitivity.toFixed(1);
    sensSlider.addEventListener('input', () => {
      const v = parseFloat(sensSlider.value);
      this.settings.sensitivity = v;
      sensVal.textContent = v.toFixed(1);
      save(this.settings);
    });

    // sound toggle
    const soundToggle = document.getElementById('settings-sound-toggle');
    soundToggle.classList.toggle('on', this.settings.sound);
    soundToggle.addEventListener('click', () => {
      this.settings.sound = !this.settings.sound;
      soundToggle.classList.toggle('on', this.settings.sound);
      save(this.settings);
    });

    // quality toggle
    const qualBtn = document.getElementById('settings-quality-btn');
    qualBtn.textContent = this.settings.quality === 'high' ? 'ВЫСОКОЕ' : 'НИЗКОЕ';
    qualBtn.addEventListener('click', () => {
      this.settings.quality = this.settings.quality === 'high' ? 'low' : 'high';
      qualBtn.textContent = this.settings.quality === 'high' ? 'ВЫСОКОЕ' : 'НИЗКОЕ';
      save(this.settings);
    });

    // reset progress
    document.getElementById('settings-reset').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      this.settings = { ...DEFAULTS };
      // update UI
      sensSlider.value = this.settings.sensitivity;
      sensVal.textContent = this.settings.sensitivity.toFixed(1);
      soundToggle.classList.toggle('on', this.settings.sound);
      qualBtn.textContent = this.settings.quality === 'high' ? 'ВЫСОКОЕ' : 'НИЗКОЕ';
    });
  }

  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    document.getElementById('settings-screen').classList.remove('hidden');
  }

  close() {
    this._isOpen = false;
    document.getElementById('settings-screen').classList.add('hidden');
    if (this.onBack) this.onBack();
  }

  get isOpen() { return this._isOpen; }
}
