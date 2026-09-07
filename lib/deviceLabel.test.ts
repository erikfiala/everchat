import { describe, expect, it } from 'vitest';
import {
  displayDeviceLabel,
  formatGuessedDeviceLabel,
  isGenericDeviceLabel,
  osLabelFromClientHints,
  osLabelFromPlatformInfo,
  osLabelFromUserAgent,
} from './deviceLabel';

describe('isGenericDeviceLabel', () => {
  it('treats empty and legacy defaults as generic', () => {
    expect(isGenericDeviceLabel(null)).toBe(true);
    expect(isGenericDeviceLabel('')).toBe(true);
    expect(isGenericDeviceLabel('  ')).toBe(true);
    expect(isGenericDeviceLabel('Primary device')).toBe(true);
    expect(isGenericDeviceLabel('additional device')).toBe(true);
  });

  it('leaves custom names alone', () => {
    expect(isGenericDeviceLabel('Mac Mini M4')).toBe(false);
    expect(isGenericDeviceLabel('Chrome on macOS')).toBe(false);
  });
});

describe('os labels', () => {
  it('maps chrome.runtime platform ids', () => {
    expect(osLabelFromPlatformInfo('mac')).toBe('macOS');
    expect(osLabelFromPlatformInfo('win')).toBe('Windows');
    expect(osLabelFromPlatformInfo('android')).toBe('Android');
    expect(osLabelFromPlatformInfo('cros')).toBe('Chrome OS');
    expect(osLabelFromPlatformInfo('linux')).toBe('Linux');
    expect(osLabelFromPlatformInfo('unknown')).toBeNull();
  });

  it('normalizes Client Hints platform without inventing hardware', () => {
    expect(osLabelFromClientHints('')).toBeNull();
    expect(osLabelFromClientHints('macOS')).toBe('macOS');
    expect(osLabelFromClientHints('Windows')).toBe('Windows');
    expect(osLabelFromClientHints('Linux')).toBe('Linux');
    expect(osLabelFromClientHints('Android')).toBe('Android');
    expect(osLabelFromClientHints('Chrome OS')).toBe('Chrome OS');
  });

  it('parses user-agent OS as a last resort', () => {
    expect(
      osLabelFromUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe('macOS');
    expect(
      osLabelFromUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe('Windows');
    expect(
      osLabelFromUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe('Linux');
    expect(
      osLabelFromUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Android');
    expect(
      osLabelFromUserAgent(
        'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome OS');
  });
});

describe('formatGuessedDeviceLabel', () => {
  it('uses Client Hints model when present and otherwise Chrome on OS', () => {
    expect(formatGuessedDeviceLabel({ model: 'Pixel 8', os: 'Android' })).toBe(
      'Pixel 8',
    );
    expect(formatGuessedDeviceLabel({ model: '', os: 'macOS' })).toBe(
      'Chrome on macOS',
    );
    expect(formatGuessedDeviceLabel({ os: 'Windows' })).toBe(
      'Chrome on Windows',
    );
    expect(formatGuessedDeviceLabel({ os: 'Linux' })).toBe('Chrome on Linux');
    expect(formatGuessedDeviceLabel({ os: 'Chrome OS' })).toBe(
      'Chrome on Chrome OS',
    );
    expect(formatGuessedDeviceLabel({})).toBe('Chrome');
  });
});

describe('displayDeviceLabel', () => {
  it('shows the guess only for this install when the stored label is generic', () => {
    expect(
      displayDeviceLabel('Primary device', {
        isCurrent: true,
        guessed: 'Chrome on macOS',
        fallback: 'Device',
      }),
    ).toBe('Chrome on macOS');
    expect(
      displayDeviceLabel('Primary device', {
        isCurrent: false,
        guessed: 'Chrome on macOS',
        fallback: 'Device',
      }),
    ).toBe('Device');
    expect(
      displayDeviceLabel('Mac Mini M4', {
        isCurrent: true,
        guessed: 'Chrome on macOS',
        fallback: 'Device',
      }),
    ).toBe('Mac Mini M4');
  });
});
