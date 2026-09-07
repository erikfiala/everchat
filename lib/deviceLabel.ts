import { DEVICE_LABEL_MAX_LEN } from '@/lib/profile';

const GENERIC_LABELS = new Set(['primary device', 'additional device']);

type NavigatorUAData = {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    architecture?: string;
    model?: string;
    platform?: string;
    platformVersion?: string;
  }>;
};

const PLATFORM_INFO_OS: Record<string, string> = {
  mac: 'macOS',
  win: 'Windows',
  android: 'Android',
  cros: 'Chrome OS',
  linux: 'Linux',
  openbsd: 'OpenBSD',
  fuchsia: 'Fuchsia',
};

const CLIENT_HINTS_OS: Record<string, string> = {
  macos: 'macOS',
  mac: 'macOS',
  macintosh: 'macOS',
  windows: 'Windows',
  win: 'Windows',
  linux: 'Linux',
  android: 'Android',
  'chrome os': 'Chrome OS',
  chromeos: 'Chrome OS',
  cros: 'Chrome OS',
  ios: 'iOS',
  ipados: 'iPadOS',
  fuchsia: 'Fuchsia',
};

/** Stored defaults from older builds — treat as unset for the current install. */
export function isGenericDeviceLabel(
  label: string | null | undefined,
): boolean {
  const trimmed = label?.trim() ?? '';
  if (!trimmed) return true;
  return GENERIC_LABELS.has(trimmed.toLowerCase());
}

export function osLabelFromPlatformInfo(os: string): string | null {
  return PLATFORM_INFO_OS[os] ?? null;
}

export function osLabelFromClientHints(platform: string): string | null {
  const trimmed = platform.trim();
  if (!trimmed) return null;
  return CLIENT_HINTS_OS[trimmed.toLowerCase()] ?? trimmed;
}

export function osLabelFromUserAgent(ua: string): string | null {
  if (/Android/i.test(ua)) return 'Android';
  if (/CrOS/i.test(ua)) return 'Chrome OS';
  if (/iPad/i.test(ua)) return 'iPadOS';
  if (/iPhone|iPod/i.test(ua)) return 'iOS';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return null;
}

/** Prefer a real Client Hints model; otherwise "Chrome on {OS}". Never invent hardware. */
export function formatGuessedDeviceLabel(opts: {
  model?: string | null;
  os?: string | null;
}): string {
  const model = opts.model?.trim() ?? '';
  if (model) return model.slice(0, DEVICE_LABEL_MAX_LEN);
  const os = opts.os?.trim() ?? '';
  if (os) return `Chrome on ${os}`.slice(0, DEVICE_LABEL_MAX_LEN);
  return 'Chrome';
}

export function displayDeviceLabel(
  stored: string | null | undefined,
  opts: { isCurrent: boolean; guessed: string; fallback: string },
): string {
  const trimmed = stored?.trim() ?? '';
  if (!isGenericDeviceLabel(trimmed)) return trimmed;
  if (opts.isCurrent && opts.guessed) return opts.guessed;
  return opts.fallback;
}

async function readClientHints(): Promise<{ model: string; platform: string }> {
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData })
    .userAgentData;
  if (!uaData) return { model: '', platform: '' };
  let platform = uaData.platform ?? '';
  let model = '';
  try {
    if (typeof uaData.getHighEntropyValues === 'function') {
      const high = await uaData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
        'architecture',
      ]);
      model = (high.model ?? '').trim();
      if (high.platform) platform = high.platform;
    }
  } catch {
    /* high-entropy hints unavailable in this context */
  }
  return { model, platform };
}

async function readPlatformInfoOs(): Promise<string | null> {
  try {
    const info = await browser.runtime.getPlatformInfo();
    return osLabelFromPlatformInfo(info.os);
  } catch {
    return null;
  }
}

export async function guessDeviceLabel(): Promise<string> {
  const hints = await readClientHints();
  const os =
    osLabelFromClientHints(hints.platform) ||
    (await readPlatformInfoOs()) ||
    osLabelFromUserAgent(navigator.userAgent ?? '');
  return formatGuessedDeviceLabel({ model: hints.model, os });
}
