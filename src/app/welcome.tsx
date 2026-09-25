import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';
import { ACCOUNT_TYPE_STYLE } from '../constants/accountTypes';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import { useTheme, spacing } from '../constants/theme';
import { LANGUAGE_NAMES, type LanguageSetting } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useAccountsStore } from '../store/accountsStore';
import { useBudgetsStore } from '../store/budgetsStore';
import { useSettingsStore } from '../store/settingsStore';
import { parseAmountToMinor, parseSignedAmountToMinor } from '../utils/money';
import { todayIso } from '../utils/date';
import type { AccountType } from '../models/types';

const TOTAL_STEPS = 3;

const STARTER_ACCOUNTS: { type: AccountType; labelKey: 'wel.cash' | 'wel.mobileMoney' | 'wel.bank' }[] = [
  { type: 'cash', labelKey: 'wel.cash' },
  { type: 'mobile_money', labelKey: 'wel.mobileMoney' },
  { type: 'bank', labelKey: 'wel.bank' },
];

/** First-run setup: language and currency, where the money is, and an optional monthly budget. */
export default function WelcomeScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const createAccount = useAccountsStore((state) => state.create);
  const createBudget = useBudgetsStore((state) => state.create);

  const [step, setStep] = useState(1);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [budgetText, setBudgetText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    const limit = budgetText.trim() === '' ? 0 : parseAmountToMinor(budgetText);
    if (Number.isNaN(limit)) return setError(t('bud.limitError'));
    setError(null);
    setSaving(true);
    try {
      for (const { type, labelKey } of STARTER_ACCOUNTS) {
        const text = balances[type]?.trim();
        if (!text) continue;
        const openingBalanceMinor = parseSignedAmountToMinor(text);
        if (Number.isNaN(openingBalanceMinor)) continue;
        const style = ACCOUNT_TYPE_STYLE[type];
        await createAccount(db, {
          name: t(labelKey),
          type,
          icon: style.icon,
          color: style.color,
          openingBalanceMinor,
        });
      }
      if (limit > 0) {
        await createBudget(db, {
          categoryId: null,
          amountLimitMinor: limit,
          currency: settings.currency,
          period: 'monthly',
          startDate: todayIso(),
        });
      }
      await settings.completeOnboarding(db);
    } catch {
      setError(t('common.tryAgain'));
      setSaving(false);
    }
  };

  const languageOptions: { value: LanguageSetting; label: string }[] = [
    { value: 'system', label: t('set.languagePhone') },
    ...(Object.keys(LANGUAGE_NAMES) as (keyof typeof LANGUAGE_NAMES)[]).map((code) => ({
      value: code as LanguageSetting,
      label: LANGUAGE_NAMES[code],
    })),
  ];

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.hero}>
        <Logo size={72} />
        <Text style={[styles.title, { color: theme.text }]}>{t('wel.title')}</Text>
        <Text style={{ color: theme.textMuted, textAlign: 'center' }}>{t('wel.subtitle')}</Text>
        <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
          {t('wel.step', { n: step, total: TOTAL_STEPS })}
        </Text>
      </View>

      {step === 1 && (
        <>
          <Text style={[styles.section, { color: theme.textMuted }]}>{t('wel.language')}</Text>
          <ChipGroup
            options={languageOptions}
            value={settings.language}
            onChange={(language) => settings.setLanguage(db, language)}
          />
          <Text style={[styles.section, { color: theme.textMuted }]}>{t('wel.currency')}</Text>
          <ChipGroup
            options={CURRENCY_OPTIONS.map((option) => ({ value: option.code, label: option.code }))}
            value={settings.currency}
            onChange={(code) => settings.setCurrency(db, code)}
          />
          <Button label={t('common.next')} onPress={() => setStep(2)} />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={[styles.heading, { color: theme.text }]}>{t('wel.accountsTitle')}</Text>
          <Text style={{ color: theme.textMuted }}>{t('wel.accountsHint')}</Text>
          {STARTER_ACCOUNTS.map(({ type, labelKey }) => (
            <TextField
              key={type}
              label={`${t(labelKey)} · ${t('wel.balance')}`}
              prefix={settings.currency}
              value={balances[type] ?? ''}
              onChangeText={(text) =>
                setBalances((current) => ({ ...current, [type]: text.replace(/[^0-9.,-]/g, '') }))
              }
              keyboardType="numbers-and-punctuation"
              placeholder="0"
            />
          ))}
          <Button label={t('common.next')} onPress={() => setStep(3)} />
          <Button label={t('common.back')} variant="secondary" onPress={() => setStep(1)} />
        </>
      )}

      {step === 3 && (
        <>
          <Text style={[styles.heading, { color: theme.text }]}>{t('wel.budgetTitle')}</Text>
          <Text style={{ color: theme.textMuted }}>{t('wel.budgetHint')}</Text>
          <TextField
            label={t('wel.budgetLimit')}
            prefix={settings.currency}
            value={budgetText}
            onChangeText={(text) => setBudgetText(text.replace(/[^0-9.,]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          {error && <Text style={{ color: theme.danger }}>{error}</Text>}
          <Button label={t('wel.finish')} onPress={finish} loading={saving} />
          <Button label={t('common.back')} variant="secondary" onPress={() => setStep(2)} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: spacing.lg },
  title: { fontSize: 26, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
});
