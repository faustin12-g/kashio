import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '../components/Screen';
import { Icon, type IconName } from '../components/Icon';
import { fonts } from '../constants/fonts';
import { useTheme, spacing } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';
import type { TranslationKey } from '../i18n';

const TOPICS: { icon: IconName; color: string; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { icon: 'plus-circle-outline', color: '#4F46E5', titleKey: 'help.addTitle', bodyKey: 'help.addBody' },
  { icon: 'bullseye-arrow', color: '#F59E0B', titleKey: 'help.budgetTitle', bodyKey: 'help.budgetBody' },
  { icon: 'autorenew', color: '#3B82F6', titleKey: 'help.recurringTitle', bodyKey: 'help.recurringBody' },
  { icon: 'handshake-outline', color: '#EC4899', titleKey: 'help.debtsTitle', bodyKey: 'help.debtsBody' },
  { icon: 'piggy-bank-outline', color: '#10B981', titleKey: 'help.goalsTitle', bodyKey: 'help.goalsBody' },
  { icon: 'calendar-month-outline', color: '#6366F1', titleKey: 'help.calendarTitle', bodyKey: 'help.calendarBody' },
  { icon: 'camera-outline', color: '#14B8A6', titleKey: 'help.receiptTitle', bodyKey: 'help.receiptBody' },
  { icon: 'cloud-upload-outline', color: '#0EA5E9', titleKey: 'help.backupTitle', bodyKey: 'help.backupBody' },
  { icon: 'fingerprint', color: '#64748B', titleKey: 'help.lockTitle', bodyKey: 'help.lockBody' },
];

/** A short, always-available reference for what each part of Kashio does. */
export default function HelpScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen options={{ title: t('help.title') }} />
      <Text style={{ color: theme.textMuted }}>{t('help.intro')}</Text>

      <View style={{ gap: spacing.md }}>
        {TOPICS.map((topic) => (
          <View key={topic.titleKey} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.icon, { backgroundColor: topic.color + '22' }]}>
              <Icon name={topic.icon} size={20} color={topic.color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: theme.text, fontFamily: fonts.semibold, fontSize: 15 }}>{t(topic.titleKey)}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 18 }}>{t(topic.bodyKey)}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, borderRadius: 14, borderWidth: 1, padding: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
