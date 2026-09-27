import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Logo } from '../../components/Logo';
import { Icon, type IconName } from '../../components/Icon';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useNotificationsStore } from '../../store/notificationsStore';
import { fonts } from '../../constants/fonts';

const TAB_ICONS: Record<string, IconName> = {
  index: 'home-outline',
  transactions: 'credit-card-outline',
  budgets: 'bullseye-arrow',
  insights: 'chart-line',
  more: 'dots-horizontal-circle-outline',
};

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const db = useSQLiteContext();
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const loadNotifications = useNotificationsStore((state) => state.load);

  useFocusEffect(
    useCallback(() => {
      loadNotifications(db);
    }, [db, loadNotifications])
  );

  /** Everything Kashio has sent, one tap away from the main screen. */
  const bellButton = () => (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={t('notif.title')}
      hitSlop={8}
      style={{ marginRight: 16 }}
    >
      <Icon name={unreadCount > 0 ? 'bell-badge-outline' : 'bell-outline'} size={24} color={theme.text} />
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -6,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 3,
            backgroundColor: theme.danger,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontFamily: fonts.extrabold }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18 },
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold },
        tabBarIcon: ({ color, size }) => <Icon name={TAB_ICONS[route.name] ?? 'circle-small'} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), headerTitle: () => <Logo size={28} />, headerRight: bellButton }} />
      <Tabs.Screen name="transactions" options={{ title: t('tabs.transactions') }} />
      <Tabs.Screen name="budgets" options={{ title: t('tabs.budgets') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more') }} />
    </Tabs>
  );
}
