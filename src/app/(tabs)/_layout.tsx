import React from 'react';
import { Tabs } from 'expo-router';
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
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), headerTitle: () => <BrandTitle /> }} />
      <Tabs.Screen name="transactions" options={{ title: t('tabs.transactions') }} />
      <Tabs.Screen name="budgets" options={{ title: t('tabs.budgets') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more') }} />
    </Tabs>
  );
}
