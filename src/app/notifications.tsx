import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { fonts } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { formatRelativeTime } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useNotificationsStore } from '../store/notificationsStore';
import type { NotificationKind } from '../models/types';
import type { IconName } from '../components/Icon';

const KIND_ICON: Record<NotificationKind, IconName> = {
  budget: 'bullseye-arrow',
  recurring: 'autorenew',
  reminder: 'pencil-outline',
  debt: 'handshake-outline',
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { items, unreadCount, load, markRead, markAllRead, clearAll } = useNotificationsStore();
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;
    return items.filter(
      (item) => item.title.toLowerCase().includes(search) || item.body.toLowerCase().includes(search)
    );
  }, [items, query]);

  const open = (id: string, route: string | null) => {
    void markRead(db, id);
    if (route) router.push(route as never);
  };

  const handleClearAll = () => {
    Alert.alert(t('notif.clearAllTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('notif.clearAll'), style: 'destructive', onPress: () => clearAll(db) },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('notif.title') }} />

      {items.length === 0 ? (
        <EmptyState icon="bell-outline" title={t('notif.empty')} message={t('notif.emptyHint')} />
      ) : (
        <View style={{ gap: 10 }}>
          <View style={[styles.searchBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Icon name="magnify" size={20} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('notif.searchPlaceholder')}
              placeholderTextColor={theme.textMuted}
              autoCorrect={false}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
                <Icon name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>

          <View style={styles.actionsRow}>
            {unreadCount > 0 && (
              <View style={{ flex: 1 }}>
                <Button label={t('notif.markAllRead')} variant="secondary" onPress={() => markAllRead(db)} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button label={t('notif.clearAll')} variant="secondary" onPress={handleClearAll} />
            </View>
          </View>

          {visible.length === 0 ? (
            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 24 }}>
              {t('notif.noMatches')}
            </Text>
          ) : (
            visible.map((item) => (
              <ListRow
                key={item.id}
                icon={KIND_ICON[item.kind]}
                color={item.readAt ? theme.textMuted : theme.primary}
                title={item.title}
                subtitle={`${item.body} · ${formatRelativeTime(item.createdAt, t)}`}
                onPress={() => open(item.id, item.route)}
              />
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, fontFamily: fonts.regular },
  actionsRow: { flexDirection: 'row', gap: 10 },
});
