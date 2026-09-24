import React, { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { useTheme, spacing } from '../../constants/theme';
import { useSettingsStore } from '../../store/settingsStore';
import { useSyncStore } from '../../store/syncStore';
import { CURRENCY_OPTIONS } from '../../constants/currencies';
import { formatRelativeToNow } from '../../utils/date';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const sync = useSyncStore();
  const [busy, setBusy] = useState<'sign-in' | 'backup' | 'restore' | null>(null);

  const handleConnect = async () => {
    setBusy('sign-in');
    try {
      await sync.signIn(db);
    } catch (error) {
      Alert.alert('Could not connect', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleBackup = async () => {
    setBusy('backup');
    try {
      await sync.backup(db);
      Alert.alert('Backed up', 'Your data has been saved to Google Drive.');
    } catch (error) {
      Alert.alert('Backup failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore from Drive?',
      'This merges the backup into your local data. Records changed more recently than the backup are kept as-is; older ones are overwritten.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setBusy('restore');
            try {
              const result = await sync.restore(db);
              Alert.alert(
                result ? 'Restore complete' : 'Nothing to restore',
                result ? 'Your data has been updated from Drive.' : 'No backup was found on Drive yet.'
              );
            } catch (error) {
              Alert.alert('Restore failed', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Google Drive?', 'Your local data stays on this device. You can reconnect anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => sync.signOut() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Currency</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
          Used for new transactions and budgets.
        </Text>
        <FlatList
          horizontal
          data={CURRENCY_OPTIONS}
          keyExtractor={(item) => item.code}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          renderItem={({ item }) => {
            const selected = item.code === currency;
            return (
              <Pressable
                onPress={() => setCurrency(db, item.code)}
                style={[
                  styles.currencyChip,
                  { backgroundColor: selected ? theme.primary : theme.surfaceAlt, borderColor: theme.border },
                ]}
              >
                <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '600' }}>
                  {item.code}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <Pressable
        onPress={() => router.push('/categories')}
        style={[styles.card, styles.linkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Add, edit, or archive categories</Text>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 20 }}>›</Text>
      </Pressable>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Google Drive backup</Text>

        {!sync.account ? (
          <>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Buget works fully offline. Connect your Google account to back up your data to a &ldquo;Buget
              Backups&rdquo; folder in your own Drive, and restore it on another device. The app can only see files
              it creates itself — never the rest of your Drive.
            </Text>
            <Button label="Connect Google Drive" onPress={handleConnect} loading={busy === 'sign-in'} />
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
              {sync.lastBackupAt ? `Last backup ${formatRelativeToNow(sync.lastBackupAt)}` : 'Never backed up yet'}
            </Text>
            {sync.lastRestoreAt && (
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                Last restore {formatRelativeToNow(sync.lastRestoreAt)}
              </Text>
            )}
            {sync.lastError && <Text style={{ color: theme.danger, fontSize: 13 }}>{sync.lastError}</Text>}

            <Button label="Back up now" onPress={handleBackup} loading={busy === 'backup'} />
            <Button label="Restore from Drive" onPress={handleRestore} variant="secondary" loading={busy === 'restore'} />
            <Button label="Disconnect" onPress={handleDisconnect} variant="secondary" />
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
  linkCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currencyChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
});
