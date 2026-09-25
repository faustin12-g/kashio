import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Logo } from './Logo';
import { useTheme } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';
import { authenticateOwner, shouldLockOnReturn } from '../services/appLock';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Covers the app with a lock screen when the app lock is on: at start-up, and
 * whenever the app has been in the background for more than a short grace
 * period. The app underneath stays mounted, so unlocking returns to exactly
 * where the person was.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const enabled = useSettingsStore((state) => state.appLockEnabled);
  const timeoutMs = useSettingsStore((state) => state.lockTimeoutMs);
  const [locked, setLocked] = useState(enabled);
  const [failed, setFailed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const ok = await authenticateOwner(t('lock.prompt'));
      setFailed(!ok);
      if (ok) setLocked(false);
    } catch {
      setFailed(true);
    } finally {
      prompting.current = false;
    }
  }, [t]);

  // Turning the lock off in settings must not leave the cover up.
  if (!enabled && locked) setLocked(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // The system prompt itself briefly takes focus; ignore that.
      if (prompting.current) return;
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        if (shouldLockOnReturn(enabled, backgroundedAt.current, Date.now(), timeoutMs)) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled, timeoutMs]);

  useEffect(() => {
    if (!locked || !enabled) return;
    // Deferred so the system prompt opens after the cover has been drawn.
    const timer = setTimeout(() => void unlock(), 0);
    return () => clearTimeout(timer);
  }, [locked, enabled, unlock]);

  return (
    <View style={styles.fill}>
      {children}
      {locked && enabled && (
        <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]}>
          <Logo size={88} />
          <Text style={[styles.title, { color: theme.text }]}>{t('lock.title')}</Text>
          <Text style={{ color: failed ? theme.danger : theme.textMuted, textAlign: 'center' }}>
            {failed ? t('lock.failed') : t('lock.subtitle')}
          </Text>
          <View style={styles.button}>
            <Button label={t('lock.unlock')} onPress={unlock} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cover: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  title: { fontSize: 22, fontWeight: '800' },
  button: { alignSelf: 'stretch', marginTop: 12 },
});
