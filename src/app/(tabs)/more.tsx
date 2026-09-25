import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { ListRow } from '../../components/ListRow';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';

/** The hub for everything that is not one of the four main tabs. */
export default function MoreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.group}>
        <ListRow
          icon="wallet-outline"
          color="#10B981"
          title={t('more.accounts')}
          subtitle={t('more.accountsHint')}
          onPress={() => router.push('/accounts')}
          showChevron
        />
        <ListRow
          icon="piggy-bank-outline"
          color="#F59E0B"
          title={t('more.goals')}
          subtitle={t('more.goalsHint')}
          onPress={() => router.push('/goals')}
          showChevron
        />
        <ListRow
          icon="handshake-outline"
          color="#EC4899"
          title={t('more.debts')}
          subtitle={t('more.debtsHint')}
          onPress={() => router.push('/debts')}
          showChevron
        />
        <ListRow
          icon="autorenew"
          color="#3B82F6"
          title={t('more.recurring')}
          subtitle={t('more.recurringHint')}
          onPress={() => router.push('/recurring')}
          showChevron
        />
      </View>

      <View style={styles.group}>
        <ListRow
          icon="tag-multiple-outline"
          color="#A855F7"
          title={t('more.categories')}
          subtitle={t('more.categoriesHint')}
          onPress={() => router.push('/categories')}
          showChevron
        />
        <ListRow
          icon="export-variant"
          color="#14B8A6"
          title={t('more.export')}
          subtitle={t('more.exportHint')}
          onPress={() => router.push('/export')}
          showChevron
        />
        <ListRow
          icon="cog-outline"
          color={theme.textMuted}
          title={t('more.settings')}
          subtitle={t('more.settingsHint')}
          onPress={() => router.push('/settings')}
          showChevron
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
});
