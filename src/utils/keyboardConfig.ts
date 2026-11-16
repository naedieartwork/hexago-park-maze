export type KeyActionId =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'confirm'
  | 'back'
  | 'hint'
  | 'weather'
  | 'pause'
  | 'restart';

export type KeyBindingsMap = Record<KeyActionId, string[]>;

export type KeyActionMeta = {
  id: KeyActionId;
  label: string;
  category: 'Arah' | 'Navigasi' | 'Aksi Game';
};

export const KEY_BINDINGS_STORAGE_KEY = 'hexago_park_key_bindings_v1';
export const SHOW_SHORTCUTS_STORAGE_KEY = 'hexago_park_show_shortcut_labels_v2';

export const DEFAULT_KEY_BINDINGS: KeyBindingsMap = {
  moveUp: ['Numpad8', 'ArrowUp'],
  moveDown: ['Numpad2', 'ArrowDown'],
  moveLeft: ['Numpad4', 'ArrowLeft'],
  moveRight: ['Numpad6', 'ArrowRight'],
  confirm: ['Enter', 'NumpadEnter', 'Numpad5'],
  back: ['Backspace', 'Escape', 'Numpad0'],
  hint: ['NumpadAdd'],
  weather: ['NumpadMultiply', 'Numpad7'],
  pause: ['NumpadSubtract', 'Numpad9'],
  restart: ['NumpadDivide', 'Numpad1'],
};

export const KEY_ACTION_META_LIST: KeyActionMeta[] = [
  { id: 'moveUp', label: 'Gerak Atas', category: 'Arah' },
  { id: 'moveDown', label: 'Gerak Bawah', category: 'Arah' },
  { id: 'moveLeft', label: 'Gerak Kiri', category: 'Arah' },
  { id: 'moveRight', label: 'Gerak Kanan', category: 'Arah' },
  {
    id: 'confirm',
    label: 'Konfirmasi / Pilih / Mulai',
    category: 'Navigasi',
  },
  {
    id: 'back',
    label: 'Keluar / Kembali / Tutup (X)',
    category: 'Navigasi',
  },
  { id: 'hint', label: 'Bantu / Hint', category: 'Aksi Game' },
  { id: 'weather', label: 'Ubah Cuaca', category: 'Aksi Game' },
  { id: 'pause', label: 'Jeda / Lanjutkan', category: 'Aksi Game' },
  { id: 'restart', label: 'Ulang Level (Restart)', category: 'Aksi Game' },
];

export function cloneDefaultKeyBindings(): KeyBindingsMap {
  return {
    moveUp: [...DEFAULT_KEY_BINDINGS.moveUp],
    moveDown: [...DEFAULT_KEY_BINDINGS.moveDown],
    moveLeft: [...DEFAULT_KEY_BINDINGS.moveLeft],
    moveRight: [...DEFAULT_KEY_BINDINGS.moveRight],
    confirm: [...DEFAULT_KEY_BINDINGS.confirm],
    back: [...DEFAULT_KEY_BINDINGS.back],
    hint: [...DEFAULT_KEY_BINDINGS.hint],
    weather: [...DEFAULT_KEY_BINDINGS.weather],
    pause: [...DEFAULT_KEY_BINDINGS.pause],
    restart: [...DEFAULT_KEY_BINDINGS.restart],
  };
}

export function loadKeyBindings(): KeyBindingsMap {
  const defaults = cloneDefaultKeyBindings();
  try {
    const raw = window.localStorage.getItem(KEY_BINDINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<KeyActionId, unknown>>;
    const result = cloneDefaultKeyBindings();
    for (const meta of KEY_ACTION_META_LIST) {
      const candidate = parsed[meta.id];
      if (
        Array.isArray(candidate) &&
        candidate.length > 0 &&
        candidate.every((item) => typeof item === 'string' && item.trim().length > 0)
      ) {
        result[meta.id] = candidate;
      }
    }
    return result;
  } catch {
    return defaults;
  }
}

export function saveKeyBindings(bindings: KeyBindingsMap): void {
  try {
    window.localStorage.setItem(KEY_BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
}

export function loadShowShortcutLabels(): boolean {
  try {
    const raw = window.localStorage.getItem(SHOW_SHORTCUTS_STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export function saveShowShortcutLabels(show: boolean): void {
  try {
    window.localStorage.setItem(SHOW_SHORTCUTS_STORAGE_KEY, show ? 'true' : 'false');
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
}

/**
 * Mengambil kode tombol kanonik dengan dukungan NumLock ON maupun OFF pada keyboard/numpad USB/OTG.
 */
export function getCanonicalKeyCode(event: KeyboardEvent): string {
  if (event.code && event.code !== 'Unidentified') {
    return event.code;
  }

  const key = event.key;
  const isNumpadLocation = event.location === 3;

  switch (key) {
    case 'ArrowUp':
      return 'ArrowUp';
    case 'ArrowDown':
      return 'ArrowDown';
    case 'ArrowLeft':
      return 'ArrowLeft';
    case 'ArrowRight':
      return 'ArrowRight';
    case 'Enter':
      return isNumpadLocation ? 'NumpadEnter' : 'Enter';
    case 'Backspace':
      return 'Backspace';
    case 'Escape':
      return 'Escape';
    case 'Clear':
      return 'Numpad5';
    case 'Insert':
      return 'Numpad0';
    case 'Home':
      return 'Numpad7';
    case 'PageUp':
      return 'Numpad9';
    case 'End':
      return 'Numpad1';
    case 'Delete':
      return isNumpadLocation ? 'NumpadDecimal' : 'Delete';
    case '+':
      return 'NumpadAdd';
    case '*':
      return 'NumpadMultiply';
    case '-':
      return isNumpadLocation ? 'NumpadSubtract' : 'Minus';
    case '/':
      return isNumpadLocation ? 'NumpadDivide' : 'Slash';
    case ' ':
      return 'Space';
    default:
      break;
  }

  if (/^[0-9]$/.test(key)) {
    return isNumpadLocation ? `Numpad${key}` : `Digit${key}`;
  }

  if (/^[a-zA-Z]$/.test(key)) {
    return `Key${key.toUpperCase()}`;
  }

  return key || 'Unknown';
}

export function matchesKeyAction(
  event: KeyboardEvent,
  action: KeyActionId,
  bindings: KeyBindingsMap
): boolean {
  const code = getCanonicalKeyCode(event);
  const actionKeys = bindings[action] ?? [];
  if (actionKeys.includes(code)) return true;

  // Dukungan fallback NumLock OFF jika perangkat OTG hanya mengirim event.key tanpa event.code Numpad*
  if (!event.code || event.code === 'Unidentified') {
    if (event.key === 'ArrowUp' && actionKeys.includes('Numpad8')) return true;
    if (event.key === 'ArrowDown' && actionKeys.includes('Numpad2')) return true;
    if (event.key === 'ArrowLeft' && actionKeys.includes('Numpad4')) return true;
    if (event.key === 'ArrowRight' && actionKeys.includes('Numpad6')) return true;
  }

  return false;
}

const KEY_DISPLAY_NAMES: Record<string, string> = {
  Numpad0: 'Num 0',
  Numpad1: 'Num 1',
  Numpad2: 'Num 2',
  Numpad3: 'Num 3',
  Numpad4: 'Num 4',
  Numpad5: 'Num 5',
  Numpad6: 'Num 6',
  Numpad7: 'Num 7',
  Numpad8: 'Num 8',
  Numpad9: 'Num 9',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadEnter: 'Num Enter',
  NumpadDecimal: 'Num .',
  ArrowUp: '↑ Atas',
  ArrowDown: '↓ Bawah',
  ArrowLeft: '← Kiri',
  ArrowRight: '→ Kanan',
  Enter: 'Enter',
  Backspace: 'Backspace',
  Escape: 'Esc',
  Space: 'Spasi',
  Minus: '-',
  Slash: '/',
  Equal: '=',
};

const COMPACT_KEY_NAMES: Record<string, string> = {
  Numpad0: '0',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Numpad4: '4',
  Numpad5: '5',
  Numpad6: '6',
  Numpad7: '7',
  Numpad8: '8',
  Numpad9: '9',
  NumpadAdd: '+',
  NumpadSubtract: '-',
  NumpadMultiply: '*',
  NumpadDivide: '/',
  NumpadEnter: '↵',
  NumpadDecimal: '.',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: '↵',
  Backspace: '⌫',
  Escape: 'Esc',
  Space: '␣',
  Minus: '-',
  Slash: '/',
};

export function formatKeyCodeLabel(code: string): string {
  if (KEY_DISPLAY_NAMES[code]) return KEY_DISPLAY_NAMES[code];
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  return code;
}

export function formatCompactKeyLabel(code: string): string {
  if (COMPACT_KEY_NAMES[code]) return COMPACT_KEY_NAMES[code];
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  return code.slice(0, 4);
}

export function getActionBadgeLabel(
  action: KeyActionId,
  bindings: KeyBindingsMap
): string {
  const keys = bindings[action] ?? DEFAULT_KEY_BINDINGS[action];
  if (keys.length === 0) return '';
  if (keys.length === 1) return formatCompactKeyLabel(keys[0]);

  const uniqueCompact: string[] = [];
  for (const k of keys) {
    const short = formatCompactKeyLabel(k);
    if (!uniqueCompact.includes(short)) {
      uniqueCompact.push(short);
    }
    if (uniqueCompact.length >= 2) break;
  }
  return uniqueCompact.join('/');
}

export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag === 'input') {
    const type = (target as HTMLInputElement).type.toLowerCase();
    return type !== 'button' && type !== 'submit' && type !== 'reset' && type !== 'checkbox' && type !== 'radio';
  }
  return target.isContentEditable;
}

function getNavigableElements(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), [role="button"]:not([aria-disabled="true"])'
    )
  );
  return candidates.filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function navigateContainerFocus(
  container: HTMLElement | null,
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
): boolean {
  if (!container) return false;
  const elements = getNavigableElements(container);
  if (elements.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  const currentIndex = active ? elements.indexOf(active) : -1;

  if (currentIndex === -1) {
    const defaultEl =
      elements.find((el) => el.dataset.kbDefault === 'true') ?? elements[0];
    defaultEl.focus();
    defaultEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  const currentRect = elements[currentIndex].getBoundingClientRect();
  const cx = currentRect.left + currentRect.width / 2;
  const cy = currentRect.top + currentRect.height / 2;

  let bestEl: HTMLElement | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < elements.length; i += 1) {
    if (i === currentIndex) continue;
    const el = elements[i];
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;

    let isValidDirection = false;
    let primaryDist = 0;
    let crossDist = 0;

    if (direction === 'RIGHT') {
      isValidDirection = dx > 8;
      primaryDist = dx;
      crossDist = Math.abs(dy);
    } else if (direction === 'LEFT') {
      isValidDirection = dx < -8;
      primaryDist = -dx;
      crossDist = Math.abs(dy);
    } else if (direction === 'DOWN') {
      isValidDirection = dy > 8;
      primaryDist = dy;
      crossDist = Math.abs(dx);
    } else if (direction === 'UP') {
      isValidDirection = dy < -8;
      primaryDist = -dy;
      crossDist = Math.abs(dx);
    }

    if (!isValidDirection) continue;
    const score = primaryDist + crossDist * 2.2;
    if (score < bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  if (!bestEl) {
    // Fallback melingkar sesuai urutan DOM agar navigasi tidak pernah buntu
    const step = direction === 'UP' || direction === 'LEFT' ? -1 : 1;
    const nextIdx = (currentIndex + step + elements.length) % elements.length;
    bestEl = elements[nextIdx];
  }

  bestEl.focus();
  bestEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}

export function activateFocusedOrDefault(container: HTMLElement | null): boolean {
  if (!container) return false;
  const elements = getNavigableElements(container);
  if (elements.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  if (active && elements.includes(active)) {
    active.click();
    return true;
  }

  const defaultEl =
    elements.find((el) => el.dataset.kbDefault === 'true') ?? elements[0];
  defaultEl.focus();
  defaultEl.click();
  return true;
}
