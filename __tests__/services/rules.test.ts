import { BACKUP_INTERVAL_MS, decideAutoBackup, isBackupDue, type AutoBackupConditions } from '../../src/services/autoBackupRules';
import {
  LOCK_TIMEOUT_OPTIONS,
  parseLockTimeout,
  RELOCK_AFTER_MS,
  shouldLockOnReturn,
} from '../../src/services/lockRules';

const NOW = 1_800_000_000_000;

const ready: AutoBackupConditions = {
  enabled: true,
  signedIn: true,
  lastBackupAt: NOW - BACKUP_INTERVAL_MS - 1000,
  nowMs: NOW,
  wifiOnly: true,
  connected: true,
  onWifi: true,
};

describe('isBackupDue', () => {
  it('is due when there has never been a backup', () => {
    expect(isBackupDue(null, NOW)).toBe(true);
  });

  it('is not due within a day of the last backup', () => {
    expect(isBackupDue(NOW - 60 * 60 * 1000, NOW)).toBe(false);
  });

  it('is due once a full day has passed', () => {
    expect(isBackupDue(NOW - BACKUP_INTERVAL_MS, NOW)).toBe(true);
  });
});

describe('decideAutoBackup', () => {
  it('runs when everything allows it', () => {
    expect(decideAutoBackup(ready)).toBe('run');
  });

  it('never runs when switched off or not signed in', () => {
    expect(decideAutoBackup({ ...ready, enabled: false })).toBe('disabled');
    expect(decideAutoBackup({ ...ready, signedIn: false })).toBe('not_signed_in');
  });

  it('waits until a backup is due', () => {
    expect(decideAutoBackup({ ...ready, lastBackupAt: NOW - 1000 })).toBe('not_due');
  });

  it('does nothing while offline', () => {
    expect(decideAutoBackup({ ...ready, connected: false, onWifi: false })).toBe('offline');
  });

  it('never uses mobile data when Wi-Fi only is chosen', () => {
    expect(decideAutoBackup({ ...ready, onWifi: false })).toBe('needs_wifi');
  });

  it('may use mobile data when Wi-Fi only is turned off', () => {
    expect(decideAutoBackup({ ...ready, wifiOnly: false, onWifi: false })).toBe('run');
  });
});

describe('shouldLockOnReturn', () => {
  it('never locks when the lock is off', () => {
    expect(shouldLockOnReturn(false, NOW - 10 * RELOCK_AFTER_MS, NOW)).toBe(false);
  });

  it('does not lock on a quick switch away and back', () => {
    expect(shouldLockOnReturn(true, NOW - 5_000, NOW)).toBe(false);
  });

  it('locks after being away longer than the grace period', () => {
    expect(shouldLockOnReturn(true, NOW - RELOCK_AFTER_MS, NOW)).toBe(true);
  });

  it('does not lock if the app was never sent to the background', () => {
    expect(shouldLockOnReturn(true, null, NOW)).toBe(false);
  });
});

describe('lock timeout', () => {
  it('locks straight away when the timeout is zero', () => {
    expect(shouldLockOnReturn(true, NOW, NOW, 0)).toBe(true);
  });

  it('waits for the chosen time before locking', () => {
    expect(shouldLockOnReturn(true, NOW - 4 * 60_000, NOW, 5 * 60_000)).toBe(false);
    expect(shouldLockOnReturn(true, NOW - 5 * 60_000, NOW, 5 * 60_000)).toBe(true);
  });

  it('accepts only the offered choices', () => {
    for (const option of LOCK_TIMEOUT_OPTIONS) expect(parseLockTimeout(String(option))).toBe(option);
    expect(parseLockTimeout(null)).toBe(RELOCK_AFTER_MS);
    expect(parseLockTimeout('12345')).toBe(RELOCK_AFTER_MS);
    expect(parseLockTimeout('abc')).toBe(RELOCK_AFTER_MS);
  });
});
