import {
  supabase,
  isSupabaseConfigured,
  SUPABASE_SETUP_GUIDE_TEXT,
} from './supabaseClient';

export const DEVICE_ID_STORAGE_KEY = 'hexago_device_id';
export const LICENSE_DATA_STORAGE_KEY = 'hexago_license_session_v2';
export const LEGACY_LICENSE_STORAGE_KEY = 'hexago_park_license_activated_v1';

export interface StoredLicenseSession {
  license_key: string;
  plan_label: string;
  is_lifetime: boolean;
  expires_at: string | null;
  device_id: string;
  activated_at: string;
}

export interface VerifyLicenseResult {
  valid: boolean;
  message: string;
  session: StoredLicenseSession | null;
  isNetworkError?: boolean;
}

interface RawRpcLicensePayload {
  valid?: boolean;
  is_valid?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  error_message?: string;
  reason?: string;
  license_key?: string;
  plan_label?: string;
  plan_name?: string;
  plan_type?: string;
  package_name?: string;
  duration_hours?: number | null;
  is_lifetime?: boolean;
  lifetime?: boolean;
  expires_at?: string | null;
  expired_at?: string | null;
  device_id?: string;
}

function generateFallbackUuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Membuat dan menyimpan UUID perangkat unik secara otomatis di localStorage (hexago_device_id)
 * agar setiap HP/perangkat memiliki identitas tersendiri untuk pembatasan kuota perangkat.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device-id';
  }
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)?.trim();
    if (existing && existing.length >= 8) {
      return existing;
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : generateFallbackUuid();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return generateFallbackUuid();
  }
}

/**
 * Menentukan label nama paket yang ramah pengguna berdasarkan respons RPC Supabase.
 */
export function resolvePlanLabel(
  raw: RawRpcLicensePayload,
  isLifetime: boolean
): string {
  const explicitLabel = (
    raw.plan_label ??
    raw.plan_name ??
    raw.package_name ??
    ''
  ).trim();

  if (explicitLabel) {
    return explicitLabel;
  }

  if (isLifetime) {
    return 'Lisensi Penuh (Selamanya)';
  }

  const planType = (raw.plan_type ?? '').trim().toLowerCase();
  if (planType === '3h' || planType === '3_hours' || planType === '3jam') {
    return 'Paket 3 Jam';
  }
  if (planType === '8h' || planType === '8_hours' || planType === '8jam') {
    return 'Paket 8 Jam';
  }
  if (planType === '1d' || planType === '24h' || planType === '1_day' || planType === '1hari') {
    return 'Paket 1 Hari';
  }
  if (planType === '30d' || planType === '720h' || planType === '30_days' || planType === '30hari') {
    return 'Paket 30 Hari';
  }
  if (planType === 'lifetime' || planType === 'full' || planType === 'selamanya') {
    return 'Lisensi Penuh (Selamanya)';
  }

  if (typeof raw.duration_hours === 'number' && raw.duration_hours > 0) {
    if (raw.duration_hours === 3) return 'Paket 3 Jam';
    if (raw.duration_hours === 8) return 'Paket 8 Jam';
    if (raw.duration_hours === 24) return 'Paket 1 Hari';
    if (raw.duration_hours === 720) return 'Paket 30 Hari';
    if (raw.duration_hours >= 24 && raw.duration_hours % 24 === 0) {
      return `Paket ${raw.duration_hours / 24} Hari`;
    }
    return `Paket ${raw.duration_hours} Jam`;
  }

  return 'Paket Akses Penuh';
}

/**
 * Memeriksa apakah sesi lisensi yang tersimpan masih aktif dan belum melewati expires_at.
 */
export function isLicenseSessionValid(
  session: StoredLicenseSession | null,
  nowMs: number = Date.now()
): boolean {
  if (!session || !session.license_key) {
    return false;
  }
  if (session.is_lifetime) {
    return true;
  }
  if (!session.expires_at) {
    return false;
  }
  const expMs = Date.parse(session.expires_at);
  if (Number.isNaN(expMs)) {
    return false;
  }
  return expMs > nowMs;
}

/**
 * Membaca sesi lisensi dari localStorage dan menghapusnya secara otomatis jika sudah kedaluwarsa.
 */
export function loadStoredLicenseSession(
  nowMs: number = Date.now()
): StoredLicenseSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // Bersihkan kunci boolean lama yang tidak memiliki data sesi valid
    window.localStorage.removeItem(LEGACY_LICENSE_STORAGE_KEY);

    const raw = window.localStorage.getItem(LICENSE_DATA_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredLicenseSession>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.license_key !== 'string' ||
      !parsed.license_key.trim()
    ) {
      window.localStorage.removeItem(LICENSE_DATA_STORAGE_KEY);
      return null;
    }

    const session: StoredLicenseSession = {
      license_key: parsed.license_key.trim(),
      plan_label:
        typeof parsed.plan_label === 'string' && parsed.plan_label.trim()
          ? parsed.plan_label.trim()
          : Boolean(parsed.is_lifetime)
          ? 'Lisensi Penuh (Selamanya)'
          : 'Paket Akses Penuh',
      is_lifetime: Boolean(parsed.is_lifetime),
      expires_at:
        typeof parsed.expires_at === 'string' && parsed.expires_at.trim()
          ? parsed.expires_at.trim()
          : null,
      device_id:
        typeof parsed.device_id === 'string' && parsed.device_id.trim()
          ? parsed.device_id.trim()
          : getOrCreateDeviceId(),
      activated_at:
        typeof parsed.activated_at === 'string' && parsed.activated_at.trim()
          ? parsed.activated_at.trim()
          : new Date().toISOString(),
    };

    if (!isLicenseSessionValid(session, nowMs)) {
      window.localStorage.removeItem(LICENSE_DATA_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function saveStoredLicenseSession(session: StoredLicenseSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LICENSE_DATA_STORAGE_KEY,
      JSON.stringify(session)
    );
    window.localStorage.removeItem(LEGACY_LICENSE_STORAGE_KEY);
  } catch {
    // Abaikan jika localStorage penuh atau diblokir
  }
}

export function clearStoredLicenseSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LICENSE_DATA_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_LICENSE_STORAGE_KEY);
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
}

/**
 * Memformat badge status lisensi untuk ditampilkan pada layar Pengaturan
 * (contoh: "Aktif — Paket 3 Jam" atau "Aktif — Lisensi Penuh (Selamanya)").
 */
export function formatLicenseStatusBadge(
  session: StoredLicenseSession | null,
  nowMs: number = Date.now()
): string {
  if (!isLicenseSessionValid(session, nowMs) || !session) {
    return 'Nonaktif';
  }
  if (session.is_lifetime) {
    const lower = session.plan_label.toLowerCase();
    if (lower.includes('selamanya') || lower.includes('lisensi penuh')) {
      return `Aktif — ${session.plan_label}`;
    }
    return 'Aktif — Lisensi Penuh (Selamanya)';
  }
  return `Aktif — ${session.plan_label}`;
}

/**
 * Memformat hitung mundur sisa waktu (jam/menit atau tanggal berakhir) untuk layar Pengaturan.
 */
export function formatLicenseCountdownDetail(
  session: StoredLicenseSession | null,
  nowMs: number = Date.now()
): string {
  if (!isLicenseSessionValid(session, nowMs) || !session) {
    return 'Aktifkan untuk membuka Level 4+ Solo & Level 2+ Kelompok.';
  }

  if (session.is_lifetime) {
    return 'Masa berlaku: Selamanya · Akses penuh 10 level terbuka.';
  }

  if (!session.expires_at) {
    return 'Akses penuh 10 level terbuka.';
  }

  const expMs = Date.parse(session.expires_at);
  if (Number.isNaN(expMs)) {
    return 'Akses penuh 10 level terbuka.';
  }

  const diffMs = Math.max(0, expMs - nowMs);
  if (diffMs <= 0) {
    return 'Masa berlaku telah berakhir. Silakan aktifkan kembali lisensi Anda.';
  }

  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  let remainingParts: string[] = [];
  if (days > 0) {
    remainingParts.push(`${days} hari`);
  }
  if (hours > 0) {
    remainingParts.push(`${hours} jam`);
  }
  if (days === 0 && minutes > 0) {
    remainingParts.push(`${minutes} menit`);
  }
  if (remainingParts.length === 0) {
    remainingParts.push('< 1 menit');
  }

  const formattedExpiry = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(expMs));

  return `Sisa waktu: ${remainingParts.join(' ')} (Berakhir: ${formattedExpiry})`;
}

/**
 * Memanggil fungsi RPC Supabase `verify_and_activate_license(p_license_key, p_device_id)`
 * untuk memvalidasi kunci lisensi sekaligus mengikat perangkat & menghitung masa berlaku.
 */
export async function verifyAndActivateLicenseRpc(
  rawLicenseKey: string,
  options?: { isBackgroundSync?: boolean }
): Promise<VerifyLicenseResult> {
  const normalizedKey = rawLicenseKey.trim().toUpperCase();
  if (!normalizedKey) {
    return {
      valid: false,
      message: 'Harap masukkan kode lisensi terlebih dahulu.',
      session: null,
    };
  }

  const deviceId = getOrCreateDeviceId();

  try {
    let data: unknown = null;

    if (isSupabaseConfigured && supabase) {
      const rpcResponse = await supabase.rpc('verify_and_activate_license', {
        p_license_key: normalizedKey,
        p_device_id: deviceId,
      });

      if (rpcResponse.error) {
        const errMsg = (rpcResponse.error.message ?? '').trim();
        const isLikelyNetwork =
          errMsg.toLowerCase().includes('fetch') ||
          errMsg.toLowerCase().includes('network') ||
          errMsg.toLowerCase().includes('failed to send');
        return {
          valid: false,
          message:
            errMsg ||
            'Gagal menghubungi server verifikasi lisensi. Periksa koneksi internet Anda.',
          session: null,
          isNetworkError: isLikelyNetwork,
        };
      }
      data = rpcResponse.data;
    } else {
      const serverRes = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_license_key: normalizedKey,
          p_device_id: deviceId,
        }),
      });

      const json = (await serverRes.json().catch(() => null)) as {
        configured?: boolean;
        data?: unknown;
        error?: string;
      } | null;

      if (!serverRes.ok) {
        if (json?.configured === false) {
          return {
            valid: false,
            message: SUPABASE_SETUP_GUIDE_TEXT,
            session: null,
            isNetworkError: Boolean(options?.isBackgroundSync),
          };
        }
        return {
          valid: false,
          message:
            json?.error ||
            'Gagal menghubungi server verifikasi lisensi. Periksa koneksi internet Anda.',
          session: null,
          isNetworkError: serverRes.status >= 500,
        };
      }

      data = json?.data ?? null;
    }

    const payload: RawRpcLicensePayload | null = Array.isArray(data)
      ? (data[0] as RawRpcLicensePayload | undefined) ?? null
      : (data as RawRpcLicensePayload | null);

    if (!payload || typeof payload !== 'object') {
      return {
        valid: false,
        message: 'Respons server lisensi tidak valid atau kode tidak ditemukan.',
        session: null,
      };
    }

    const isValid = Boolean(
      payload.valid ?? payload.is_valid ?? payload.success
    );

    if (!isValid) {
      const serverErrorMessage = (
        payload.message ??
        payload.error ??
        payload.error_message ??
        payload.reason ??
        'Kunci lisensi tidak terdaftar, kuota perangkat penuh, atau masa berlaku telah habis.'
      ).trim();

      return {
        valid: false,
        message: serverErrorMessage,
        session: null,
      };
    }

    const expiresAtRaw = (payload.expires_at ?? payload.expired_at ?? null) as
      | string
      | null;
    const isLifetime = Boolean(
      payload.is_lifetime ??
        payload.lifetime ??
        ((expiresAtRaw === null || expiresAtRaw === '') &&
          (payload.duration_hours === null ||
            String(payload.plan_type ?? '')
              .toLowerCase()
              .includes('lifetime') ||
            String(payload.plan_label ?? '')
              .toLowerCase()
              .includes('selamanya')))
    );

    const expiresAt =
      !isLifetime && typeof expiresAtRaw === 'string' && expiresAtRaw.trim()
        ? expiresAtRaw.trim()
        : null;

    if (!isLifetime && expiresAt) {
      const expMs = Date.parse(expiresAt);
      if (!Number.isNaN(expMs) && expMs <= Date.now()) {
        return {
          valid: false,
          message:
            payload.message?.trim() ||
            'Masa aktif kode lisensi ini telah berakhir (kedaluwarsa).',
          session: null,
        };
      }
    }

    const planLabel = resolvePlanLabel(payload, isLifetime);
    const session: StoredLicenseSession = {
      license_key: (payload.license_key ?? normalizedKey).trim().toUpperCase(),
      plan_label: planLabel,
      is_lifetime: isLifetime,
      expires_at: expiresAt,
      device_id: (payload.device_id ?? deviceId).trim(),
      activated_at: new Date().toISOString(),
    };

    saveStoredLicenseSession(session);

    return {
      valid: true,
      message:
        payload.message?.trim() ||
        `Lisensi berhasil diaktifkan (${session.plan_label})!`,
      session,
    };
  } catch (err) {
    const errText =
      err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.';
    return {
      valid: false,
      message: `Gagal memverifikasi lisensi: ${errText}`,
      session: null,
      isNetworkError: true,
    };
  }
}
