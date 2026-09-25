import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { BrandTitle } from '../../components/Logo';
import { Icon, type IconName } from '../../components/Icon';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';

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

  /** The same "new transaction" action as the floating button, always visible in the header. */
  const addButton = () => (
    <Pressable
      onPress={() => router.push('/transactions/new')}
      accessibilityRole="button"
      accessibilityLabel={t('home.addTransaction')}
      hitSlop={8}
      style={{ marginRight: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name="plus" size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => <Icon name={TAB_ICONS[route.name] ?? 'circle-small'} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), headerTitle: () => <BrandTitle />, headerRight: addButton }} />
      <Tabs.Screen name="transactions" options={{ title: t('tabs.transactions'), headerRight: addButton }} />
      <Tabs.Screen name="budgets" options={{ title: t('tabs.budgets') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more') }} />
    </Tabs>
  );
}
