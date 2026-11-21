/**
 * Moment v1.3.0
 * Clean clock · countdown · message
 * Contact: hi.kyro@tuta.io · github.com/its-me-kyro
 */

const STORAGE_KEY = 'moment-settings-v1';

function getStoredSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings(partial) {
  const current = getStoredSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
}


// ---------- Color & position helpers ----------

function bindColor(id, cssProp, el, key) {
  const input = document.getElementById(id);
  if (!input || !el) return;
  const settings = getStoredSettings();
  if (settings[key]) {
    input.value = settings[key];
    el.style.color = settings[key];
  }
  input.addEventListener('input', () => {
    el.style.color = input.value;
    saveSettings({ [key]: input.value });
  });
}

function bindAxis(prefix, el, keyX, keyY, keyR) {
  // prefix e.g. "time" -> ids pos-time-x, pos-time-x-num, pos-time-y, pos-time-y-num, pos-time-r, pos-time-r-num
  const sx = document.getElementById('pos-' + prefix + '-x');
  const sy = document.getElementById('pos-' + prefix + '-y');
  const sr = document.getElementById('pos-' + prefix + '-r');
  const nx = document.getElementById('pos-' + prefix + '-x-num');
  const ny = document.getElementById('pos-' + prefix + '-y-num');
  const nr = document.getElementById('pos-' + prefix + '-r-num');
  const elements = (Array.isArray(el) ? el : [el]).filter(Boolean);
  if (!elements.length) return;
  if (!sx && !sy) return;
  // Prefer a currently visible element for limit calculations
  const primaryOf = () => {
    const visible = elements.find((e) => e.offsetParent !== null || (e.offsetWidth > 0 && e.offsetHeight > 0));
    return visible || elements[0];
  };

  const settings = getStoredSettings();
  let x = Number(settings[keyX] ?? 0);
  let y = Number(settings[keyY] ?? 0);
  let r = Number(settings[keyR] ?? 0);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const syncUI = () => {
    if (sx) sx.value = x;
    if (sy) sy.value = y;
    if (sr) sr.value = r;
    if (nx) nx.value = x;
    if (ny) ny.value = y;
    if (nr) nr.value = r;
  };

  const getLimits = () => {
    const primary = primaryOf();
    const scale = Number(primary.dataset.sizeScale || 1);
    const baseW = Math.max(1, primary.offsetWidth || primary.getBoundingClientRect().width || 100);
    const baseH = Math.max(1, primary.offsetHeight || primary.getBoundingClientRect().height || 60);
    const width = baseW * scale;
    const height = baseH * scale;
    const radians = (r * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(radians));
    const absSin = Math.abs(Math.sin(radians));
    const rotatedWidth = (width * absCos) + (height * absSin);
    const rotatedHeight = (width * absSin) + (height * absCos);
    const safeWidth = Math.max(0, window.innerWidth - 32);
    const safeHeight = Math.max(0, window.innerHeight - 32);
    const maxX = Math.max(0, Math.floor(((safeWidth - rotatedWidth) / 2 / baseW) * 100));
    const maxY = Math.max(0, Math.floor(((safeHeight - rotatedHeight) / 2 / baseH) * 100));
    return { maxX, maxY };
  };
  const applyLimits = () => {
    const { maxX, maxY } = getLimits();
    if (sx) { sx.min = -maxX; sx.max = maxX; }
    if (nx) { nx.min = -maxX; nx.max = maxX; }
    if (sy) { sy.min = -maxY; sy.max = maxY; }
    if (ny) { ny.min = -maxY; ny.max = maxY; }
    x = clamp(x, -maxX, maxX);
    y = clamp(y, -maxY, maxY);
  };
  const apply = () => {
    applyLimits();
    const primary = primaryOf();
    const scale = primary.dataset.sizeScale || elements[0].dataset.sizeScale || '1';
    elements.forEach((node) => {
      node.dataset.posX = String(x);
      node.dataset.posY = String(y);
      node.dataset.posR = String(r);
      if (!node.dataset.sizeScale) node.dataset.sizeScale = scale;
      node.style.transform = `translate(${x}%, ${y}%) rotate(${r}deg) scale(${node.dataset.sizeScale || scale})`;
    });
    syncUI();
  };

  apply();
  window.addEventListener('resize', apply);
  // Recalculate after fonts, content, and responsive layout change dimensions.
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => apply());
    elements.forEach((node) => observer.observe(node));
  }

  const setX = (v) => {
    const { maxX } = getLimits();
    x = clamp(parseInt(v, 10) || 0, -maxX, maxX);
    apply();
    saveSettings({ [keyX]: x });
  };
  const setY = (v) => {
    const { maxY } = getLimits();
    y = clamp(parseInt(v, 10) || 0, -maxY, maxY);
    apply();
    saveSettings({ [keyY]: y });
  };
  const setR = (v) => {
    r = clamp(parseInt(v, 10) || 0, -180, 180);
    apply();
    if (keyR) saveSettings({ [keyR]: r });
  };

  sx?.addEventListener('input', () => setX(sx.value));
  sy?.addEventListener('input', () => setY(sy.value));
  sr?.addEventListener('input', () => setR(sr.value));
  nx?.addEventListener('change', () => setX(nx.value));
  ny?.addEventListener('change', () => setY(ny.value));
  nr?.addEventListener('change', () => setR(nr.value));
  nx?.addEventListener('input', () => setX(nx.value));
  ny?.addEventListener('input', () => setY(ny.value));
  nr?.addEventListener('input', () => setR(nr.value));
}



function bindSize(id, element, storageKey, defaultValue = 100) {
  const slider = document.getElementById(id);
  const valueLabel = document.getElementById(id + '-value');
  const elements = (Array.isArray(element) ? element : [element]).filter(Boolean);
  if (!slider || !elements.length) return;
  const saved = getStoredSettings()[storageKey];
  const value = Number(saved ?? defaultValue);
  slider.value = value;
  const apply = (v) => {
    const scale = String(v / 100);
    elements.forEach((el) => {
      el.dataset.sizeScale = scale;
      el.style.setProperty('--user-scale', scale);
      // Also apply transform scale when element uses it directly (flip-clock)
      if (el.classList.contains('flip-clock') || el.classList.contains('sw-flip')) {
        const t = el.style.transform || '';
        // preserve translate/rotate from axis if present via dataset
        const x = el.dataset.posX || '0';
        const y = el.dataset.posY || '0';
        const r = el.dataset.posR || '0';
        el.style.transform = `translate(${x}%, ${y}%) rotate(${r}deg) scale(${scale})`;
      }
    });
    if (valueLabel) valueLabel.textContent = `${v}%`;
  };
  apply(value);
  slider.addEventListener('input', () => {
    const next = Number(slider.value);
    apply(next);
    saveSettings({ [storageKey]: next });
    window.dispatchEvent(new Event('resize'));
  });
}

function initResetButton() {
  const button = document.getElementById('reset-settings');
  button?.addEventListener('click', () => {
    if (window.confirm('Reset all Moment settings to their defaults?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  });
}

function pad(n) { return String(n).padStart(2, '0'); }

function getTimezoneLabel(tz) {
  if (!tz || tz === 'local') {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'; }
    catch { return 'Local time'; }
  }
  return tz.replace(/_/g, ' ');
}

// ---------- Custom background (images + GIFs) ----------

function applyCustomBackground(url) {
  if (url) {
    document.body.style.backgroundImage = `url("${url}")`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
  } else {
    document.body.style.backgroundImage = '';
  }
}

function setupCustomBackgroundUI() {
  const section = document.getElementById('custom-bg-section');
  const urlInput = document.getElementById('custom-bg-url');
  const fileInput = document.getElementById('custom-bg-file');
  const clearBtn = document.getElementById('clear-custom-bg');
  const settings = getStoredSettings();

  if (settings.customBgUrl && urlInput) urlInput.value = settings.customBgUrl;

  function activateCustomTheme() {
    setBodyTheme('custom');
    document.querySelectorAll('.theme-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.theme === 'custom');
    });
    if (section) section.style.display = 'block';
    saveSettings({ theme: 'custom' });
  }

  urlInput?.addEventListener('change', () => {
    const url = urlInput.value.trim();
    if (url) {
      applyCustomBackground(url);
      saveSettings({ customBgUrl: url, customBgData: null });
      activateCustomTheme();
    }
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      applyCustomBackground(dataUrl);
      saveSettings({ customBgData: dataUrl, customBgUrl: null });
      if (urlInput) urlInput.value = '';
      activateCustomTheme();
    };
    reader.readAsDataURL(file);
  });

  clearBtn?.addEventListener('click', () => {
    applyCustomBackground(null);
    saveSettings({ customBgUrl: null, customBgData: null });
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    if (document.body.classList.contains('theme-custom')) {
      setBodyTheme('dark');
      document.querySelectorAll('.theme-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.theme === 'dark');
      });
      saveSettings({ theme: 'dark' });
      if (section) section.style.display = 'none';
    }
  });
}

// ---------- Zen mode (shared) ----------


const FLIP_DESIGNS = {
  classic: { text: '#f0f0f2', top: '#2a2a30', bottom: '#1c1c20', seam: '#000000' },
  airport: { text: '#fff8e7', top: '#3d3428', bottom: '#2a2218', seam: '#1a1410' },
  neon: { text: '#a5f3fc', top: '#0e2a32', bottom: '#081c22', seam: '#22d3ee' },
  gold: { text: '#fde68a', top: '#3d2e12', bottom: '#2a1f0c', seam: '#fbbf24' },
  minimal: { text: '#e5e7eb', top: '#374151', bottom: '#1f2937', seam: '#6b7280' },
  inverse: { text: '#111827', top: '#f3f4f6', bottom: '#e5e7eb', seam: '#9ca3af' },
  ocean: { text: '#e0f2fe', top: '#164e63', bottom: '#0c4a6e', seam: '#38bdf8' },
  carbon: { text: '#fafafa', top: '#262626', bottom: '#171717', seam: '#404040' },
};

function applyFlipDesign(name, colors) {
  const roots = document.querySelectorAll('.flip-clock');
  const design = name || 'classic';
  roots.forEach((root) => {
    // strip old design classes
    [...root.classList].forEach((c) => {
      if (c.startsWith('flip-design-')) root.classList.remove(c);
    });
    root.classList.add('flip-design-' + design);
    const c = colors || FLIP_DESIGNS[design] || FLIP_DESIGNS.classic;
    if (c.text) root.style.setProperty('--flip-text', c.text);
    if (c.top) root.style.setProperty('--flip-top', c.top);
    if (c.bottom) root.style.setProperty('--flip-bottom', c.bottom);
    if (c.seam) root.style.setProperty('--flip-seam', c.seam);
  });
  // update color inputs if present
  const map = {
    'flip-color-text': 'text',
    'flip-color-top': 'top',
    'flip-color-bottom': 'bottom',
    'flip-color-seam': 'seam',
  };
  const c = colors || FLIP_DESIGNS[design] || FLIP_DESIGNS.classic;
  Object.entries(map).forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input && c[key]) input.value = c[key];
  });
  document.querySelectorAll('.flip-design-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.flipDesign === design);
  });
}

function initFlipStyleUI() {
  const settings = getStoredSettings();
  const design = settings.flipDesign || 'classic';
  const custom = {
    text: settings.flipColorText,
    top: settings.flipColorTop,
    bottom: settings.flipColorBottom,
    seam: settings.flipColorSeam,
  };
  const base = { ...FLIP_DESIGNS[design] };
  // override with saved custom colors if any
  if (custom.text) base.text = custom.text;
  if (custom.top) base.top = custom.top;
  if (custom.bottom) base.bottom = custom.bottom;
  if (custom.seam) base.seam = custom.seam;
  applyFlipDesign(design, base);

  document.querySelectorAll('.flip-design-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.flipDesign;
      const colors = FLIP_DESIGNS[name];
      applyFlipDesign(name, colors);
      saveSettings({
        flipDesign: name,
        flipColorText: colors.text,
        flipColorTop: colors.top,
        flipColorBottom: colors.bottom,
        flipColorSeam: colors.seam,
      });
    });
  });

  const bindFlipColor = (id, key, storageKey) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', () => {
      document.querySelectorAll('.flip-clock').forEach((root) => {
        root.style.setProperty('--flip-' + (key === 'text' ? 'text' : key), input.value);
      });
      // mark design as custom-ish but keep last preset name
      saveSettings({ [storageKey]: input.value });
    });
  };
  bindFlipColor('flip-color-text', 'text', 'flipColorText');
  bindFlipColor('flip-color-top', 'top', 'flipColorTop');
  bindFlipColor('flip-color-bottom', 'bottom', 'flipColorBottom');
  bindFlipColor('flip-color-seam', 'seam', 'flipColorSeam');
}


function initZenMode() {
  const zenBtn = document.getElementById('zen-btn');
  if (!zenBtn) return;

  function enterZen() { document.body.classList.add('zen-mode'); }
  function exitZen() {
    document.body.classList.remove('zen-mode');
    // Re-show fullscreen exit if still fullscreen
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      document.getElementById('fullscreen-exit')?.classList.add('visible');
    }
  }

  zenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    enterZen();
    document.getElementById('fullscreen-exit')?.classList.remove('visible');
  });

  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('zen-mode')) {
      exitZen();
      return;
    }
    // When not in zen but in fullscreen, clicking elsewhere shows the exit button again
    if ((document.fullscreenElement || document.webkitFullscreenElement) &&
        !e.target.closest('#fullscreen-exit') &&
        !e.target.closest('#fullscreen-btn') &&
        !e.target.closest('.settings-panel') &&
        !e.target.closest('.top-nav')) {
      document.getElementById('fullscreen-exit')?.classList.add('visible');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      exitZen();
    }
  });
}


function setBodyTheme(themeName) {
  const keep = [...document.body.classList].filter((c) => !c.startsWith('theme-'));
  document.body.className = ['theme-' + themeName, ...keep].join(' ');
}


function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  let glow = document.getElementById('cursor-glow');
  if (!glow) {
    glow = document.createElement('div');
    glow.id = 'cursor-glow';
    document.body.prepend(glow);
  }
  let raf = 0;
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let cx = tx;
  let cy = ty;
  const tick = () => {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    glow.style.left = cx + 'px';
    glow.style.top = cy + 'px';
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
  }, { passive: true });
  document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { glow.style.opacity = ''; });
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = [...document.body.classList].find((c) => c.startsWith('theme-'))?.replace('theme-', '') || 'dark';
    const next = (current === 'light' || current === 'paper') ? 'dark' : 'light';
    setBodyTheme(next);
    // clear custom bg image when leaving custom
    if (current === 'custom') document.body.style.backgroundImage = '';
    document.querySelectorAll('.theme-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.theme === next);
    });
    const section = document.getElementById('custom-bg-section');
    if (section) section.style.display = 'none';
    saveSettings({ theme: next });
  });
}

function initFullscreen() {
  const btn = document.getElementById('fullscreen-btn');
  const exitBtn = document.getElementById('fullscreen-exit');
  if (!btn) return;

  const docEl = document.documentElement;

  function isFs() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function updateUI() {
    const on = isFs();
    document.body.classList.toggle('is-fullscreen', on);
    if (on && !document.body.classList.contains('zen-mode')) {
      exitBtn?.classList.add('visible');
    } else {
      exitBtn?.classList.remove('visible');
    }
  }

  async function enter() {
    try {
      if (docEl.requestFullscreen) await docEl.requestFullscreen();
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
    } catch (err) {
      console.warn('Fullscreen failed', err);
    }
  }

  async function leave() {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (err) {
      console.warn('Exit fullscreen failed', err);
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isFs()) leave();
    else enter();
  });

  exitBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    leave();
  });

  document.addEventListener('fullscreenchange', updateUI);
  document.addEventListener('webkitfullscreenchange', updateUI);
  // Esc is handled by the browser for fullscreen; we still sync UI
  updateUI();
}

// ---------- Shared settings UI ----------

function initSettingsUI({ onThemeChange, onTimezoneChange, onFontChange } = {}) {
  const panel = document.getElementById('settings-panel');
  const overlay = document.getElementById('overlay');
  const openBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('close-settings');
  const tzSelect = document.getElementById('timezone-select');
  const fontSelect = document.getElementById('font-select');
  const themeBtns = document.querySelectorAll('.theme-btn');
  const customBgSection = document.getElementById('custom-bg-section');
  const settings = getStoredSettings();

  let theme = settings.theme || 'dark';
  setBodyTheme(theme);
  themeBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.theme === theme));
  if (theme === 'custom' && customBgSection) customBgSection.style.display = 'block';

  if (settings.customBgData) applyCustomBackground(settings.customBgData);
  else if (settings.customBgUrl) applyCustomBackground(settings.customBgUrl);

  if (settings.timezone && tzSelect) tzSelect.value = settings.timezone;
  if (settings.font && fontSelect) {
    fontSelect.value = settings.font;
    document.documentElement.style.setProperty('--clock-font', `"${settings.font}", sans-serif`);
  }

  setupCustomBackgroundUI();
  initZenMode();
  initResetButton();
  initThemeToggle();
  initFullscreen();
  initCursorGlow();

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('visible');
    setTimeout(() => { overlay.hidden = true; }, 300);
  }

  openBtn?.addEventListener('click', (e) => { e.stopPropagation(); openPanel(); });
  closeBtn?.addEventListener('click', closePanel);
  overlay?.addEventListener('click', closePanel);

  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.theme;
      setBodyTheme(t);
      themeBtns.forEach((b) => b.classList.toggle('active', b === btn));
      if (customBgSection) customBgSection.style.display = t === 'custom' ? 'block' : 'none';
      if (t !== 'custom') {
        document.body.style.backgroundImage = '';
      } else {
        const s = getStoredSettings();
        if (s.customBgData) applyCustomBackground(s.customBgData);
        else if (s.customBgUrl) applyCustomBackground(s.customBgUrl);
      }
      saveSettings({ theme: t });
      onThemeChange?.(t);
    });
  });

  tzSelect?.addEventListener('change', () => {
    saveSettings({ timezone: tzSelect.value });
    onTimezoneChange?.(tzSelect.value);
  });

  fontSelect?.addEventListener('change', () => {
    const font = fontSelect.value;
    document.documentElement.style.setProperty('--clock-font', `"${font}", sans-serif`);
    saveSettings({ font });
    onFontChange?.(font);
  });

  return {
    getTimezone: () => tzSelect?.value || settings.timezone || 'local',
    closePanel,
  };
}

// ---------- Clock ----------

function initClock() {
  const timeEl = document.getElementById('time');
  const dateEl = document.getElementById('date');
  const tzLabelEl = document.getElementById('timezone-label');
  const format24h = document.getElementById('format-24h');
  const showSeconds = document.getElementById('show-seconds');
  const showDate = document.getElementById('show-date');
  const showWeekday = document.getElementById('show-weekday');
  const showTimezone = document.getElementById('show-timezone');
  const flipModeToggle = document.getElementById('flip-mode');
  const flipRoot = document.getElementById('flip-clock');

  const settings = getStoredSettings();
  if (format24h) format24h.checked = settings.format24h !== false;
  if (showSeconds) showSeconds.checked = settings.showSeconds !== false;
  if (showDate) showDate.checked = settings.showDate !== false;
  if (showWeekday) showWeekday.checked = settings.showWeekday !== false;
  if (showTimezone) {
    showTimezone.checked = settings.showTimezone !== false;
    tzLabelEl.classList.toggle('hidden', !showTimezone.checked);
  }
  dateEl.classList.toggle('hidden', settings.showDate === false);

  // Flipboard mode
  const flipEnabled = settings.flipMode === true;
  if (flipModeToggle) flipModeToggle.checked = flipEnabled;
  document.body.classList.toggle('flip-mode', flipEnabled);
  if (flipRoot) flipRoot.setAttribute('aria-hidden', flipEnabled ? 'false' : 'true');

  const flipSlots = {};
  if (flipRoot) {
    flipRoot.querySelectorAll('[data-slot]').forEach((el) => {
      flipSlots[el.dataset.slot] = el;
      el.dataset.value = '0';
    });
  }

  function setFlipDigit(slot, digit, animate = true) {
    const el = flipSlots[slot];
    if (!el) return;
    const d = String(digit);
    const top = el.querySelector('.half.top span');
    const bottom = el.querySelector('.half.bottom span');
    if (el.dataset.value === d) {
      // keep halves in sync even if value unchanged (first paint)
      if (top) top.textContent = d;
      if (bottom) bottom.textContent = d;
      return;
    }
    const old = el.dataset.value ?? '0';
    el.dataset.value = d;

    if (!animate || old === undefined) {
      if (top) top.textContent = d;
      if (bottom) bottom.textContent = d;
      return;
    }

    // Remove any leftover leaf
    el.querySelectorAll('.flip-leaf').forEach((n) => n.remove());

    const leaf = document.createElement('div');
    leaf.className = 'flip-leaf';
    leaf.innerHTML = `<span>${old}</span>`;
    el.appendChild(leaf);

    // New value already on static top (revealed as leaf folds away)
    if (top) top.textContent = d;

    requestAnimationFrame(() => {
      leaf.classList.add('flipping');
    });
    leaf.addEventListener('animationend', () => {
      if (bottom) bottom.textContent = d;
      leaf.remove();
    }, { once: true });
    // Safety: if animation doesn't fire
    setTimeout(() => {
      if (leaf.parentNode) {
        if (bottom) bottom.textContent = d;
        leaf.remove();
      }
    }, 400);
  }

  function updateFlip(hours, minutes, seconds, withSec) {
    const h = pad(hours);
    const m = pad(minutes);
    const s = pad(seconds);
    setFlipDigit('h0', h[0]);
    setFlipDigit('h1', h[1]);
    setFlipDigit('m0', m[0]);
    setFlipDigit('m1', m[1]);
    setFlipDigit('s0', s[0]);
    setFlipDigit('s1', s[1]);
    flipRoot?.querySelectorAll('.sec-digit, .sec-colon').forEach((n) => {
      n.style.display = withSec ? '' : 'none';
    });
  }

  flipModeToggle?.addEventListener('change', () => {
    const on = !!flipModeToggle.checked;
    document.body.classList.toggle('flip-mode', on);
    if (flipRoot) flipRoot.setAttribute('aria-hidden', on ? 'false' : 'true');
    saveSettings({ flipMode: on });
    update();
  });
  initFlipStyleUI();

  if (settings.font) {
    document.documentElement.style.setProperty('--clock-font', `"${settings.font}", sans-serif`);
  }

  let currentTz = settings.timezone || 'local';

  initSettingsUI({
    onTimezoneChange: (tz) => { currentTz = tz; update(); },
  });

  // Colors
  bindColor('color-time', 'color', timeEl, 'colorTime');
  bindColor('color-date', 'color', dateEl, 'colorDate');
  bindColor('color-tz', 'color', tzLabelEl, 'colorTz');

  // Positions & size (apply to both plain time and flipboard)
  bindAxis('time', [timeEl, flipRoot], 'posTimeX', 'posTimeY', 'posTimeR');
  bindAxis('date', dateEl, 'posDateX', 'posDateY', 'posDateR');
  bindSize('size-time', [timeEl, flipRoot], 'sizeTime');
  bindSize('size-date', dateEl, 'sizeDate');

  // Color for flip digits follows time color
  const colorTimeInput = document.getElementById('color-time');
  if (colorTimeInput && flipRoot) {
    colorTimeInput.addEventListener('input', () => {
      // optional sync: don't override dedicated flip colors unless user wants
    });
  }


  [format24h, showSeconds, showDate, showWeekday, showTimezone].forEach((el) => {
    el?.addEventListener('change', () => {
      saveSettings({
        format24h: format24h?.checked !== false,
        showSeconds: showSeconds?.checked !== false,
        showDate: showDate?.checked !== false,
        showWeekday: showWeekday?.checked !== false,
        showTimezone: showTimezone?.checked !== false,
      });
      dateEl.classList.toggle('hidden', showDate && !showDate.checked);
      tzLabelEl.classList.toggle('hidden', showTimezone && !showTimezone.checked);
      update();
    });
  });

  function update() {
    const now = new Date();
    const use24 = format24h ? format24h.checked : true;
    const withSec = showSeconds ? showSeconds.checked : true;
    const withWeekday = showWeekday ? showWeekday.checked : true;

    let timeStr, dateStr;
    let hoursNum, minutesNum, secondsNum;

    if (currentTz === 'local') {
      hoursNum = now.getHours();
      minutesNum = now.getMinutes();
      secondsNum = now.getSeconds();
      let hours = hoursNum;
      if (use24) {
        timeStr = `${pad(hours)}:${pad(minutesNum)}`;
        if (withSec) timeStr += `:${pad(secondsNum)}`;
      } else {
        const suffix = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12 || 12;
        timeStr = `${hours}:${pad(minutesNum)}`;
        if (withSec) timeStr += `:${pad(secondsNum)}`;
        timeStr += suffix;
      }
      const opts = { year: 'numeric', month: 'long', day: 'numeric' };
      if (withWeekday) opts.weekday = 'long';
      dateStr = now.toLocaleDateString('en-US', opts);
    } else {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: currentTz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const get = (t) => parseInt(parts.find((p) => p.type === t)?.value, 10) || 0;
      hoursNum = get('hour');
      minutesNum = get('minute');
      secondsNum = get('second');

      const timeOpts = {
        timeZone: currentTz,
        hour: 'numeric',
        minute: '2-digit',
        second: withSec ? '2-digit' : undefined,
        hour12: !use24,
      };
      timeStr = new Intl.DateTimeFormat('en-US', timeOpts).format(now).replace(/\u202f/g, ' ');
      const dateOpts = { timeZone: currentTz, year: 'numeric', month: 'long', day: 'numeric' };
      if (withWeekday) dateOpts.weekday = 'long';
      dateStr = now.toLocaleDateString('en-US', dateOpts);
    }

    timeEl.textContent = timeStr;
    dateEl.textContent = dateStr;
    tzLabelEl.textContent = getTimezoneLabel(currentTz);

    if (document.body.classList.contains('flip-mode')) {
      let fh = hoursNum;
      if (!use24) fh = hoursNum % 12 || 12;
      updateFlip(fh, minutesNum, secondsNum, withSec);
    }
  }

  update();
  setInterval(update, 250);
}

// ---------- Countdown ----------

function createDateInTimezone(year, month, day, hour, minute, second, tz) {
  if (!tz || tz === 'local') return new Date(year, month, day, hour, minute, second);
  const guess = new Date(Date.UTC(year, month, day, hour, minute, second));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(guess);
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value, 10);
    const desired = Date.UTC(year, month, day, hour, minute, second);
    const actual = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const diff = desired - actual;
    if (Math.abs(diff) < 1000) break;
    guess.setTime(guess.getTime() + diff);
  }
  return guess;
}

const PRESETS = {
  newyear2027: {
    title: 'New Year 2027',
    getTarget(tz) { return createDateInTimezone(2027, 0, 1, 0, 0, 0, tz); },
  },
  christmas: {
    title: 'Christmas',
    getTarget(tz) {
      const y = new Date().getFullYear();
      let t = createDateInTimezone(y, 11, 25, 0, 0, 0, tz);
      if (t.getTime() < Date.now()) t = createDateInTimezone(y + 1, 11, 25, 0, 0, 0, tz);
      return t;
    },
  },
  stream: {
    title: 'Stream starts in…',
    getTarget() { return null; }, // uses custom date
  },
  event: {
    title: 'Event starts in…',
    getTarget() { return null; },
  },
  custom: {
    title: 'Custom Countdown',
    getTarget() { return null; },
  },
};


function initCountdown() {
  // Global flipboard preference (shared with clock / stopwatch)
  const flipModeToggle = document.getElementById('flip-mode');
  const flipOn = getStoredSettings().flipMode === true;
  if (flipModeToggle) flipModeToggle.checked = flipOn;
  document.body.classList.toggle('flip-mode', flipOn);
  flipModeToggle?.addEventListener('change', () => {
    const on = !!flipModeToggle.checked;
    document.body.classList.toggle('flip-mode', on);
    saveSettings({ flipMode: on });
  });

  const titleEl = document.getElementById('countdown-title');
  const subtitleEl = document.getElementById('countdown-subtitle');
  const footerEl = document.getElementById('countdown-footer-text');
  const container = document.getElementById('countdown-container');
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const targetDateEl = document.getElementById('target-date');
  const customSection = document.getElementById('custom-fields-section');
  const customInput = document.getElementById('custom-date');
  const customTitleInput = document.getElementById('custom-title');
  const customSubtitleInput = document.getElementById('custom-subtitle');
  const customFooterInput = document.getElementById('custom-footer');
  const positionSelect = document.getElementById('countdown-position');
  const showTarget = document.getElementById('show-target');
  const showDays = document.getElementById('show-days');
  const showHours = document.getElementById('show-hours');
  const showMinutes = document.getElementById('show-minutes');
  const showSeconds = document.getElementById('show-seconds');
  const showLabels = document.getElementById('show-labels');
  const presetBtns = document.querySelectorAll('.preset-btn[data-preset]');
  const fontSelect = document.getElementById('font-select');

  const settings = getStoredSettings();
  let currentPreset = settings.countdownPreset || 'newyear2027';
  let currentTz = settings.timezone || 'local';
  let customTarget = settings.customTarget ? new Date(settings.customTarget) : null;
  let customTitle = settings.customTitle || '';
  let customSubtitle = settings.customSubtitle || '';
  let customFooter = settings.customFooter || '';

  // Restore checkboxes
  if (showTarget) {
    showTarget.checked = settings.showTarget !== false;
    targetDateEl?.classList.toggle('hidden', !showTarget.checked);
  }
  if (showDays) showDays.checked = settings.cdShowDays !== false;
  if (showHours) showHours.checked = settings.cdShowHours !== false;
  if (showMinutes) showMinutes.checked = settings.cdShowMinutes !== false;
  if (showSeconds) showSeconds.checked = settings.cdShowSeconds !== false;
  if (showLabels) showLabels.checked = settings.cdShowLabels !== false;

  if (positionSelect) {
    positionSelect.value = settings.countdownPosition || 'center';
    applyPosition(positionSelect.value);
  }

  if (settings.font && fontSelect) {
    fontSelect.value = settings.font;
    document.documentElement.style.setProperty('--clock-font', `"${settings.font}", sans-serif`);
  }

  presetBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === currentPreset);
  });

  // Always show custom fields (title/subtitle/footer/date) so user can edit
  // For built-in presets, date is auto; title can still be overridden
  if (customTitleInput) customTitleInput.value = customTitle || defaultTitleFor(currentPreset);
  if (customSubtitleInput) customSubtitleInput.value = customSubtitle;
  if (customFooterInput) customFooterInput.value = customFooter;
  if (customTarget && customInput) {
    const iso = new Date(customTarget.getTime() - customTarget.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    customInput.value = iso;
  }

  // Highlight date field when using custom/stream/event
  updateCustomFieldsVisibility();

  initSettingsUI({
    onTimezoneChange: (tz) => { currentTz = tz; tick(); },
    onFontChange: (font) => {
      document.documentElement.style.setProperty('--clock-font', `"${font}", sans-serif`);
    },
  });

  // Colors
  bindColor('color-title', 'color', titleEl, 'colorTitle');
  bindColor('color-numbers', 'color', document.getElementById('countdown-display'), 'colorNumbers');
  // Apply number color to all .value elements
  const numColorInput = document.getElementById('color-numbers');
  if (numColorInput) {
    const applyNumColor = (c) => {
      document.querySelectorAll('.countdown-display .value').forEach((el) => { el.style.color = c; });
    };
    const s = getStoredSettings();
    if (s.colorNumbers) applyNumColor(s.colorNumbers);
    numColorInput.addEventListener('input', () => {
      applyNumColor(numColorInput.value);
      saveSettings({ colorNumbers: numColorInput.value });
    });
  }
  const labelColorInput = document.getElementById('color-labels');
  if (labelColorInput) {
    const applyLabelColor = (c) => {
      document.querySelectorAll('.countdown-display .label').forEach((el) => { el.style.color = c; });
    };
    const s = getStoredSettings();
    if (s.colorLabels) { labelColorInput.value = s.colorLabels; applyLabelColor(s.colorLabels); }
    labelColorInput.addEventListener('input', () => {
      applyLabelColor(labelColorInput.value);
      saveSettings({ colorLabels: labelColorInput.value });
    });
  }
  bindColor('color-subtitle', 'color', subtitleEl, 'colorSubtitle');
  bindColor('color-footer', 'color', footerEl, 'colorFooter');

  // Positions
  bindAxis('title', titleEl, 'posTitleX', 'posTitleY', 'posTitleR');
  bindAxis('timer', document.getElementById('countdown-display'), 'posTimerX', 'posTimerY', 'posTimerR');
  bindSize('size-title', titleEl, 'sizeTitle');
  bindSize('size-timer', document.getElementById('countdown-display'), 'sizeTimer');


  function defaultTitleFor(preset) {
    if (preset === 'stream') return 'Stream starts in…';
    if (preset === 'event') return 'Event starts in…';
    if (preset === 'newyear2027') return 'New Year 2027';
    if (preset === 'christmas') return 'Christmas';
    return 'Custom Countdown';
  }

  function updateCustomFieldsVisibility() {
    // Always visible so title can be edited for any preset
    if (customSection) customSection.style.display = 'block';
  }

  function applyPosition(pos) {
    if (!container) return;
    container.classList.remove('pos-center', 'pos-top', 'pos-bottom');
    container.classList.add('pos-' + (pos || 'center'));
  }

  function applyUnitVisibility() {
    const map = {
      days: showDays?.checked !== false,
      hours: showHours?.checked !== false,
      minutes: showMinutes?.checked !== false,
      seconds: showSeconds?.checked !== false,
    };
    document.querySelectorAll('.unit[data-unit]').forEach((el) => {
      const u = el.dataset.unit;
      el.classList.toggle('hidden', !map[u]);
    });
    // Hide separators that are between hidden units – simple approach: hide all seps if any unit hidden adjacent is complex; hide seps when labels off is separate
    document.querySelectorAll('[data-sep]').forEach((sep) => {
      sep.classList.toggle('hidden', false);
    });
    // Show/hide labels
    const labelsOn = showLabels?.checked !== false;
    document.querySelectorAll('.unit .label').forEach((l) => {
      l.classList.toggle('hidden', !labelsOn);
    });
  }

  showTarget?.addEventListener('change', () => {
    saveSettings({ showTarget: showTarget.checked });
    targetDateEl?.classList.toggle('hidden', !showTarget.checked);
  });

  [showDays, showHours, showMinutes, showSeconds, showLabels].forEach((el) => {
    el?.addEventListener('change', () => {
      saveSettings({
        cdShowDays: showDays?.checked !== false,
        cdShowHours: showHours?.checked !== false,
        cdShowMinutes: showMinutes?.checked !== false,
        cdShowSeconds: showSeconds?.checked !== false,
        cdShowLabels: showLabels?.checked !== false,
      });
      applyUnitVisibility();
    });
  });

  positionSelect?.addEventListener('change', () => {
    applyPosition(positionSelect.value);
    saveSettings({ countdownPosition: positionSelect.value });
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPreset = btn.dataset.preset;
      presetBtns.forEach((b) => b.classList.toggle('active', b === btn));
      // Pre-fill title if empty or was a default
      if (customTitleInput) {
        const defaults = ['New Year 2027', 'Christmas', 'Stream starts in…', 'Event starts in…', 'Custom Countdown', ''];
        if (!customTitle || defaults.includes(customTitle)) {
          customTitle = defaultTitleFor(currentPreset);
          customTitleInput.value = customTitle;
        }
      }
      updateCustomFieldsVisibility();
      saveSettings({ countdownPreset: currentPreset, customTitle });
      tick();
    });
  });

  customInput?.addEventListener('change', () => {
    if (customInput.value) {
      customTarget = new Date(customInput.value);
      saveSettings({ customTarget: customTarget.toISOString() });
      // Switching to a date means treat as custom timing
      if (['newyear2027', 'christmas'].includes(currentPreset)) {
        currentPreset = 'custom';
        presetBtns.forEach((b) => b.classList.toggle('active', b.dataset.preset === 'custom'));
        saveSettings({ countdownPreset: 'custom' });
      }
      tick();
    }
  });

  customTitleInput?.addEventListener('input', () => {
    customTitle = customTitleInput.value;
    saveSettings({ customTitle });
    tick();
  });
  customSubtitleInput?.addEventListener('input', () => {
    customSubtitle = customSubtitleInput.value;
    saveSettings({ customSubtitle });
    tick();
  });
  customFooterInput?.addEventListener('input', () => {
    customFooter = customFooterInput.value;
    saveSettings({ customFooter });
    tick();
  });

  function getTarget() {
    if (['custom', 'stream', 'event'].includes(currentPreset) || customTarget) {
      if (customTarget) return customTarget;
      // fallback 1 hour
      return new Date(Date.now() + 3600000);
    }
    return PRESETS[currentPreset].getTarget(currentTz);
  }

  function tick() {
    const target = getTarget();
    let diff = Math.max(0, target.getTime() - Date.now());
    const days = Math.floor(diff / 86400000); diff %= 86400000;
    const hours = Math.floor(diff / 3600000); diff %= 3600000;
    const minutes = Math.floor(diff / 60000); diff %= 60000;
    const seconds = Math.floor(diff / 1000);

    const setFlipValue = (el, next) => {
      if (!el) return;
      if (el.textContent === next) return;
      el.textContent = next;
      if (document.body.classList.contains('flip-mode')) {
        el.classList.remove('is-flipping');
        void el.offsetWidth;
        el.classList.add('is-flipping');
        el.addEventListener('animationend', () => el.classList.remove('is-flipping'), { once: true });
      }
    };
    setFlipValue(daysEl, String(days).padStart(3, '0'));
    setFlipValue(hoursEl, pad(hours));
    setFlipValue(minutesEl, pad(minutes));
    setFlipValue(secondsEl, pad(seconds));

    // Title: prefer user custom title, else preset default
    const title = (customTitle && customTitle.trim()) ? customTitle : defaultTitleFor(currentPreset);
    if (titleEl) titleEl.textContent = title;

    if (subtitleEl) {
      subtitleEl.textContent = customSubtitle || '';
      subtitleEl.classList.toggle('hidden', !customSubtitle);
    }
    if (footerEl) {
      footerEl.textContent = customFooter || '';
      footerEl.classList.toggle('hidden', !customFooter);
    }

    const opts = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    };
    if (currentTz && currentTz !== 'local') opts.timeZone = currentTz;
    if (targetDateEl) targetDateEl.textContent = `Until ${target.toLocaleString('en-US', opts)}`;

    applyUnitVisibility();
  }

  applyUnitVisibility();
  tick();
  setInterval(tick, 250);
}

// ---------- Message ----------

function initMessage() {
  const display = document.getElementById('message-display');
  const container = document.getElementById('message-container');
  const alignSelect = document.getElementById('message-align');
  const fontSelect = document.getElementById('font-select');
  const zoomSlider = document.getElementById('zoom-slider');
  const zoomValue = document.getElementById('zoom-value');
  const tip = document.getElementById('fullscreen-tip');
  const dismissTip = document.getElementById('dismiss-tip');
  const purposeBtns = document.querySelectorAll('.purpose-btn');

  const settings = getStoredSettings();
  let zoomFactor = (settings.messageZoom || 100) / 100;

  if (settings.messageText) display.textContent = settings.messageText;
  if (settings.messageAlign) {
    display.style.textAlign = settings.messageAlign;
    if (alignSelect) alignSelect.value = settings.messageAlign;
  }
  if (settings.font) {
    display.style.fontFamily = `"${settings.font}", sans-serif`;
    if (fontSelect) fontSelect.value = settings.font;
  }
  if (zoomSlider) {
    zoomSlider.value = settings.messageZoom || 100;
    zoomValue.textContent = (settings.messageZoom || 100) + '%';
  }
  if (settings.hideFullscreenTip) tip?.classList.add('hidden');

  dismissTip?.addEventListener('click', (e) => {
    e.stopPropagation();
    tip?.classList.add('hidden');
    saveSettings({ hideFullscreenTip: true });
  });

  initSettingsUI({
    onFontChange: (font) => {
      display.style.fontFamily = `"${font}", sans-serif`;
      requestAnimationFrame(fitText);
    },
  });

  bindColor('color-message', 'color', display, 'colorMessage');
  bindAxis('msg', display, 'posMsgX', 'posMsgY', 'posMsgR');
  bindSize('size-message', display, 'sizeMessage');


  alignSelect?.addEventListener('change', () => {
    display.style.textAlign = alignSelect.value;
    saveSettings({ messageAlign: alignSelect.value });
    requestAnimationFrame(fitText);
  });

  zoomSlider?.addEventListener('input', () => {
    const val = parseInt(zoomSlider.value, 10);
    zoomFactor = val / 100;
    zoomValue.textContent = val + '%';
    saveSettings({ messageZoom: val });
    fitText();
  });

  // Quick purpose messages
  purposeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.text || '';
      display.textContent = text;
      saveSettings({ messageText: text });
      fitText();
      display.focus();
    });
  });

  function fitText() {
    if (!display || !container) return;
    const text = display.textContent || '';
    if (!text.trim()) {
      display.style.fontSize = Math.min(container.clientWidth, container.clientHeight) * 0.18 + 'px';
      return;
    }

    const maxW = container.clientWidth * 0.90;
    const maxH = container.clientHeight * 0.80;

    display.style.width = maxW + 'px';
    display.style.maxHeight = 'none';
    display.style.overflow = 'visible';

    let low = 10;
    let high = Math.min(maxW, maxH) * 1.4;

    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      display.style.fontSize = mid + 'px';
      const fits = display.scrollWidth <= maxW + 2 && display.scrollHeight <= maxH + 2;
      if (fits) low = mid;
      else high = mid;
    }

    const finalSize = Math.max(14, Math.floor(low * zoomFactor));
    display.style.fontSize = finalSize + 'px';
    display.style.maxHeight = maxH + 'px';
    display.style.overflow = 'hidden';
  }

  let saveTimeout;
  display.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveSettings({ messageText: display.textContent }), 250);
    fitText();
  });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(fitText, 40);
  });

  requestAnimationFrame(() => requestAnimationFrame(fitText));
  setTimeout(() => display.focus(), 80);
}


// ---------- Stopwatch ----------

function initStopwatch() {
  const timeEl = document.getElementById('sw-time');
  const flipRoot = document.getElementById('sw-flip');
  const startBtn = document.getElementById('sw-start');
  const lapBtn = document.getElementById('sw-lap');
  const resetBtn = document.getElementById('sw-reset');
  const lapsList = document.getElementById('sw-laps');
  const showCs = document.getElementById('sw-show-cs');
  const flipModeToggle = document.getElementById('flip-mode');

  const settings = getStoredSettings();
  if (showCs) showCs.checked = settings.swShowCs !== false;
  const flipEnabled = settings.flipMode === true;
  if (flipModeToggle) flipModeToggle.checked = flipEnabled;
  document.body.classList.toggle('flip-mode', flipEnabled);
  if (flipRoot) flipRoot.setAttribute('aria-hidden', flipEnabled ? 'false' : 'true');

  if (settings.font) {
    document.documentElement.style.setProperty('--clock-font', `"${settings.font}", sans-serif`);
  }

  initSettingsUI();

  bindColor('color-sw', 'color', timeEl, 'colorSw');
  bindAxis('sw', [timeEl, flipRoot], 'posSwX', 'posSwY', 'posSwR');
  bindSize('size-sw', [timeEl, flipRoot], 'sizeSw');

  const controlsEl = document.getElementById('sw-controls');
  bindAxis('swbtns', controlsEl, 'posSwBtnsX', 'posSwBtnsY', 'posSwBtnsR');
  bindSize('size-sw-btns', controlsEl, 'sizeSwBtns');

  const colorSw = document.getElementById('color-sw');
  // Plain time color stays on #sw-time; flipboard uses Flipboard design colors

  const flipSlots = {};
  if (flipRoot) {
    flipRoot.querySelectorAll('[data-slot]').forEach((el) => {
      flipSlots[el.dataset.slot] = el;
      el.dataset.value = '0';
    });
  }

  function setFlipDigit(slot, digit) {
    const el = flipSlots[slot];
    if (!el) return;
    const d = String(digit);
    const top = el.querySelector('.half.top span');
    const bottom = el.querySelector('.half.bottom span');
    if (el.dataset.value === d) {
      if (top) top.textContent = d;
      if (bottom) bottom.textContent = d;
      return;
    }
    const old = el.dataset.value ?? '0';
    el.dataset.value = d;
    el.querySelectorAll('.flip-leaf').forEach((n) => n.remove());
    const leaf = document.createElement('div');
    leaf.className = 'flip-leaf';
    leaf.innerHTML = `<span>${old}</span>`;
    el.appendChild(leaf);
    if (top) top.textContent = d;
    requestAnimationFrame(() => leaf.classList.add('flipping'));
    leaf.addEventListener('animationend', () => {
      if (bottom) bottom.textContent = d;
      leaf.remove();
    }, { once: true });
    setTimeout(() => {
      if (leaf.parentNode) {
        if (bottom) bottom.textContent = d;
        leaf.remove();
      }
    }, 400);
  }

  function updateFlip(h, m, s, cs, withCs) {
    const hh = pad(h);
    const mm = pad(m);
    const ss = pad(s);
    const cc = pad(cs);
    setFlipDigit('h0', hh[0]);
    setFlipDigit('h1', hh[1]);
    setFlipDigit('m0', mm[0]);
    setFlipDigit('m1', mm[1]);
    setFlipDigit('s0', ss[0]);
    setFlipDigit('s1', ss[1]);
    setFlipDigit('cs0', cc[0]);
    setFlipDigit('cs1', cc[1]);
    flipRoot?.querySelectorAll('.sw-cs, .sw-cs-sep').forEach((n) => {
      n.style.display = withCs ? '' : 'none';
    });
  }

  flipModeToggle?.addEventListener('change', () => {
    const on = !!flipModeToggle.checked;
    document.body.classList.toggle('flip-mode', on);
    if (flipRoot) flipRoot.setAttribute('aria-hidden', on ? 'false' : 'true');
    saveSettings({ flipMode: on });
    render(true);
  });
  initFlipStyleUI();

  showCs?.addEventListener('change', () => {
    saveSettings({ swShowCs: showCs.checked });
    render(true);
  });

  let running = false;
  let startTs = 0;
  let elapsed = 0;
  let raf = 0;
  let laps = [];

  function format(ms, withCs) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const m = totalMin % 60;
    const h = Math.floor(totalMin / 60);
    let str = `${pad(h)}:${pad(m)}:${pad(s)}`;
    if (withCs) str += `.${pad(cs)}`;
    return { str, h, m, s, cs };
  }

  function render(force) {
    const withCs = showCs ? showCs.checked : true;
    const nowMs = running ? elapsed + (performance.now() - startTs) : elapsed;
    const { str, h, m, s, cs } = format(nowMs, withCs);
    if (timeEl) timeEl.textContent = str;
    if (document.body.classList.contains('flip-mode')) {
      updateFlip(h, m, s, cs, withCs);
    }
  }

  function tick() {
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function setRunning(on) {
    running = on;
    if (startBtn) {
      startBtn.textContent = on ? 'Pause' : (elapsed > 0 ? 'Resume' : 'Start');
      startBtn.classList.toggle('sw-running', on);
    }
    if (lapBtn) lapBtn.disabled = !on;
    if (resetBtn) resetBtn.disabled = on || elapsed === 0;
  }

  startBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (running) {
      elapsed += performance.now() - startTs;
      cancelAnimationFrame(raf);
      setRunning(false);
      render(true);
    } else {
      startTs = performance.now();
      setRunning(true);
      raf = requestAnimationFrame(tick);
    }
  });

  lapBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!running) return;
    const nowMs = elapsed + (performance.now() - startTs);
    const withCs = showCs ? showCs.checked : true;
    const { str } = format(nowMs, withCs);
    laps.unshift({ n: laps.length + 1, str });
    if (lapsList) {
      const li = document.createElement('li');
      li.innerHTML = `<span>Lap ${laps[0].n}</span><span>${str}</span>`;
      lapsList.prepend(li);
    }
  });

  resetBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    cancelAnimationFrame(raf);
    running = false;
    elapsed = 0;
    startTs = 0;
    laps = [];
    if (lapsList) lapsList.innerHTML = '';
    setRunning(false);
    if (resetBtn) resetBtn.disabled = true;
    render(true);
  });

  setRunning(false);
  render(true);
}
