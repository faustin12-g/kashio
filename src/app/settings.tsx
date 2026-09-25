import React, { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import type { IconName } from '../components/Icon';
import { TimeField } from '../components/TimeField';
import { useTheme, spacing } from '../constants/theme';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import { THEME_MODE_OPTIONS, type ThemeMode } from '../constants/themeMode';
import { LANGUAGE_NAMES, formatRelativeTime, type LanguageSetting } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { countTransactions } from '../repositories/transactionsRepository';
import { authenticateOwner, isAppLockAvailable } from '../services/appLock';
import { registerAutoBackupTask, unregisterAutoBackupTask } from '../services/autoBackup';
import { syncDailyReminder } from '../services/reminders';

const THEME_ICONS: Record<ThemeMode, IconName> = {
  system: 'cellphone',
  light: 'white-balance-sunny',
  dark: 'weather-night',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const settings = useSettingsStore();
  const sync = useSyncStore();
  const [busy, setBusy] = useState<'sign-in' | 'backup' | 'restore' | null>(null);

  // ---------- currency ----------
  const changeCurrency = async (code: string) => {
    if (code === settings.currency) return;
    // Nothing to warn about on a fresh install with no amounts yet.
    if ((await countTransactions(db)) === 0) {
      await settings.setCurrency(db, code);
      return;
    }
    Alert.alert(t('set.currencyChangeTitle', { currency: code }), t('set.currencyChangeMessage', { currency: code }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('set.change'), onPress: () => settings.setCurrency(db, code) },
    ]);
  };

  // ---------- language ----------
  const changeLanguage = async (language: LanguageSetting) => {
    await settings.setLanguage(db, language);
    // Scheduled reminder text is fixed when it is scheduled, so redo it in the new language.
    const state = useSettingsStore.getState();
    await syncDailyReminder(state.reminderEnabled, state.reminderTime).catch(() => undefined);
  };

  // ---------- app lock ----------
  const toggleAppLock = async (enabled: boolean) => {
    if (!enabled) {
      await settings.setAppLockEnabled(db, false);
      return;
    }
    if (!(await isAppLockAvailable())) {
      Alert.alert(t('set.appLock'), t('set.appLockUnavailable'));
      return;
    }
    // Prove it is the owner before turning it on, so nobody is locked out by a slip.
    if (await authenticateOwner(t('set.appLockConfirm'))) {
      await settings.setAppLockEnabled(db, true);
    }
  };

  // ---------- reminder ----------
  const toggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const allowed = await syncDailyReminder(true, settings.reminderTime);
      if (!allowed) {
        Alert.alert(t('set.reminder'), t('set.reminderDenied'));
        return;
      }
    } else {
      await syncDailyReminder(false, settings.reminderTime);
    }
    await settings.setReminder(db, enabled, settings.reminderTime);
  };

  const changeReminderTime = async (time: string) => {
    await settings.setReminder(db, settings.reminderEnabled, time);
    if (settings.reminderEnabled) await syncDailyReminder(true, time);
  };

  // ---------- google drive ----------
  const handleConnect = async () => {
    setBusy('sign-in');
    try {
      await sync.signIn(db);
    } catch (error) {
      Alert.alert(t('drive.couldNotConnect'), error instanceof Error ? error.message : t('common.tryAgain'));
    } finally {
      setBusy(null);
    }
  };

  const handleBackup = async () => {
    setBusy('backup');
    try {
      await sync.backup(db);
      Alert.alert(t('drive.backedUpTitle'), t('drive.backedUpMessage'));
    } catch (error) {
      Alert.alert(t('drive.backupFailed'), error instanceof Error ? error.message : t('common.tryAgain'));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = () => {
    Alert.alert(t('drive.restoreTitle'), t('drive.restoreMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('drive.restoreAction'),
        onPress: async () => {
          setBusy('restore');
          try {
            const result = await sync.restore(db);
            Alert.alert(
              result ? t('drive.restoreDoneTitle') : t('drive.restoreNothingTitle'),
              result ? t('drive.restoreDoneMessage') : t('drive.restoreNothingMessage')
            );
          } catch (error) {
            Alert.alert(t('drive.restoreFailed'), error instanceof Error ? error.message : t('common.tryAgain'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const handleDisconnect = () => {
    Alert.alert(t('drive.disconnectTitle'), t('drive.disconnectMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('drive.disconnect'),
        style: 'destructive',
        onPress: async () => {
          await sync.signOut();
          await settings.setAutoBackup(db, false, settings.autoBackupWifiOnly);
          await unregisterAutoBackupTask();
        },
      },
    ]);
  };

  const toggleAutoBackup = async (enabled: boolean) => {
    await settings.setAutoBackup(db, enabled, settings.autoBackupWifiOnly);
    if (enabled) await registerAutoBackupTask().catch(() => undefined);
    else await unregisterAutoBackupTask();
  };

  const languageOptions: { value: LanguageSetting; label: string }[] = [
    { value: 'system', label: t('set.languagePhone') },
    { value: 'en', label: LANGUAGE_NAMES.en },
    { value: 'fr', label: LANGUAGE_NAMES.fr },
    { value: 'rw', label: LANGUAGE_NAMES.rw },
  ];

  const themeLabel = (mode: ThemeMode) =>
    mode === 'system' ? t('set.themePhone') : mode === 'light' ? t('set.themeLight') : t('set.themeDark');

  return (
    <Screen>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('set.currency')}</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('set.currencyHint')}</Text>
        <FlatList
          horizontal
          data={CURRENCY_OPTIONS}
          keyExtractor={(item) => item.code}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          renderItem={({ item }) => {
            const selected = item.code === settings.currency;
            return (
              <Pressable
                onPress={() => changeCurrency(item.code)}
                style={[
                  styles.currencyChip,
                  { backgroundColor: selected ? theme.primary : theme.surfaceAlt, borderColor: theme.border },
                ]}
              >
                <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '600' }}>{item.code}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('set.language')}</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('set.languageHint')}</Text>
        <ChipGroup options={languageOptions} value={settings.language} onChange={changeLanguage} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('set.appearance')}</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('set.appearanceHint')}</Text>
        <ChipGroup
          options={THEME_MODE_OPTIONS.map((option) => ({
            value: option.value,
            label: themeLabel(option.value),
            icon: THEME_ICONS[option.value],
          }))}
          value={settings.themeMode}
          onChange={(mode) => settings.setThemeMode(db, mode)}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('set.security')}</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>{t('set.appLock')}</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('set.appLockHint')}</Text>
          </View>
          <Switch
            value={settings.appLockEnabled}
            onValueChange={toggleAppLock}
            trackColor={{ true: theme.primary, false: theme.surfaceAlt }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('set.reminder')}</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('set.reminderHint')}</Text>
          </View>
          <Switch
            value={settings.reminderEnabled}
            onValueChange={toggleReminder}
            trackColor={{ true: theme.primary, false: theme.surfaceAlt }}
          />
        </View>
        {settings.reminderEnabled && (
          <TimeField label={t('set.reminderTime')} value={settings.reminderTime} onChange={changeReminderTime} />
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('drive.title')}</Text>

        {!sync.account ? (
          <>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('drive.intro')}</Text>
            <Button label={t('drive.connect')} onPress={handleConnect} loading={busy === 'sign-in'} />
          </>
        ) : (
          <>
            <View style={styles.accountRow}>
              {sync.account.photoUrl ? (
                <Image source={{ uri: sync.account.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.surfaceAlt }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600' }} numberOfLines={1}>
                  {sync.account.name ?? sync.account.email}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }} numberOfLines={1}>
                  {sync.account.email}
                </Text>
              </View>
            </View>

            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              {sync.lastBackupAt
                ? t('drive.lastBackup', { time: formatRelativeTime(sync.lastBackupAt, t) })
                : t('drive.never')}
            </Text>
            {sync.lastRestoreAt && (
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                {t('drive.lastRestore', { time: formatRelativeTime(sync.lastRestoreAt, t) })}
              </Text>
            )}
            {sync.lastError && <Text style={{ color: theme.danger, fontSize: 13 }}>{sync.lastError}</Text>}

            <Button label={t('drive.backupNow')} onPress={handleBackup} loading={busy === 'backup'} />
            <Button
              label={t('drive.restore')}
              onPress={handleRestore}
              variant="secondary"
              loading={busy === 'restore'}
            />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{t('drive.auto')}</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('drive.autoHint')}</Text>
              </View>
              <Switch
                value={settings.autoBackupEnabled}
                onValueChange={toggleAutoBackup}
                trackColor={{ true: theme.primary, false: theme.surfaceAlt }}
              />
            </View>
            {settings.autoBackupEnabled && (
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{t('drive.wifiOnly')}</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{t('drive.wifiOnlyHint')}</Text>
                </View>
                <Switch
                  value={settings.autoBackupWifiOnly}
                  onValueChange={(wifiOnly) => settings.setAutoBackup(db, true, wifiOnly)}
                  trackColor={{ true: theme.primary, false: theme.surfaceAlt }}
                />
              </View>
            )}

            <Button label={t('drive.disconnect')} onPress={handleDisconnect} variant="secondary" />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSubtitle: { fontSize: 13, lineHeight: 18 },
  card: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  currencyChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});
