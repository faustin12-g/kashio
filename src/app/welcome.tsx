import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmountInput } from '../components/AmountInput';
import { Icon, type IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import {
  BudgetIllustration,
  ChartIllustration,
  CoinsIllustration,
  SafeIllustration,
} from '../components/WelcomeIllustrations';
import { ACCOUNT_TYPE_STYLE } from '../constants/accountTypes';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import { fonts } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { LANGUAGE_NAMES, resolveLanguage, type Language } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useAccountsStore } from '../store/accountsStore';
import { useBudgetsStore } from '../store/budgetsStore';
import { useSettingsStore } from '../store/settingsStore';
import { formatAmountForInput, parseAmountToMinor, parseSignedAmountToMinor, sanitizeAmountInput } from '../utils/money';
import { todayIso } from '../utils/date';
import type { AccountType } from '../models/types';

const LANGUAGES = Object.keys(LANGUAGE_NAMES) as Language[];

const STARTER_ACCOUNTS: { type: AccountType; labelKey: 'wel.cash' | 'wel.mobileMoney' | 'wel.bank' }[] = [
  { type: 'cash', labelKey: 'wel.cash' },
  { type: 'mobile_money', labelKey: 'wel.mobileMoney' },
  { type: 'bank', labelKey: 'wel.bank' },
];

type SlideKey = 's1' | 's2' | 's3' | 's4';
const SLIDES: { key: SlideKey; Illustration: React.ComponentType }[] = [
  { key: 's1', Illustration: CoinsIllustration },
  { key: 's2', Illustration: BudgetIllustration },
  { key: 's3', Illustration: ChartIllustration },
  { key: 's4', Illustration: SafeIllustration },
];
/** Page 0 is the greeting with the language choice, then one page per slide. */
const PAGE_COUNT = SLIDES.length + 1;
const SETUP_STEPS = 3;

/** Height of the on-screen keyboard, so the last button never hides behind it. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * First run. A short swipeable tour with moving pictures, then three quick
 * choices: currency, where the money is, and an optional monthly budget.
 * Very little text: each page says one thing.
 */
export default function WelcomeScreen() {
  const [phase, setPhase] = useState<'tour' | 'setup'>('tour');
  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Background />
      {phase === 'tour' ? <Tour onDone={() => setPhase('setup')} /> : <Setup />}
    </SafeAreaView>
  );
}

function Background() {
  const theme = useTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} pointerEvents="none" />;
}

// ---------------------------------------------------------------------------
// Tour
// ---------------------------------------------------------------------------

function Tour({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const selectedLanguage = resolveLanguage(language);

  const scrollX = useState(() => new Animated.Value(0))[0];
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const dotWidths = useState(() => Array.from({ length: PAGE_COUNT }, (_, i) => new Animated.Value(i === 0 ? 26 : 8)))[0];
  const logoIn = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.spring(logoIn, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  }, [logoIn]);

  useEffect(() => {
    dotWidths.forEach((value, index) =>
      Animated.timing(value, {
        toValue: index === page ? 26 : 8,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start()
    );
  }, [page, dotWidths]);

  const last = page === PAGE_COUNT - 1;
  const goNext = () => {
    if (last) onDone();
    else scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  /** How far page `index` is from being centred: fades and shrinks whatever is leaving. */
  const around = (index: number, outputs: [number, number, number]) =>
    scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: outputs,
      extrapolate: 'clamp',
    });

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        {!last && (
          <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.semibold, color: theme.textMuted, fontSize: 15 }}>{t('common.skip')}</Text>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
        style={styles.flex}
      >
        {/* Page 0: greeting and language */}
        <View style={[styles.page, { width }]}>
          <Animated.View
            style={{
              alignItems: 'center',
              opacity: around(0, [0, 1, 0]),
              transform: [{ scale: logoIn }, { translateX: around(0, [width * 0.3, 0, -width * 0.3]) }],
            }}
          >
            <View style={[styles.logoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Logo size={84} />
            </View>
            <Text style={[styles.title, { color: theme.text, marginTop: 24 }]}>{t('wel.title')}</Text>
            <Text style={[styles.text, { color: theme.textMuted }]}>{t('wel.subtitle')}</Text>
          </Animated.View>

          <Animated.View style={{ width: '100%', marginTop: 36, gap: 10, opacity: around(0, [0, 1, 0]) }}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('wel.pickLanguage')}</Text>
            {LANGUAGES.map((code) => {
              const selected = code === selectedLanguage;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLanguage(db, code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.choice,
                    {
                      backgroundColor: selected ? theme.primary + '1A' : theme.surface,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: theme.text }}>
                    {LANGUAGE_NAMES[code]}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' },
                    ]}
                  >
                    {selected && <Icon name="check" size={16} color={theme.primaryText} />}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>

        {/* Pages 1..n: one picture, one line */}
        {SLIDES.map(({ key, Illustration }, offset) => {
          const index = offset + 1;
          return (
            <View key={key} style={[styles.page, { width }]}>
              <Animated.View
                style={{
                  opacity: around(index, [0, 1, 0]),
                  transform: [
                    { translateX: around(index, [width * 0.45, 0, -width * 0.45]) },
                    { scale: around(index, [0.7, 1, 0.7]) },
                  ],
                }}
              >
                <Illustration />
              </Animated.View>
              <Animated.View
                style={{
                  alignItems: 'center',
                  marginTop: 28,
                  opacity: around(index, [0, 1, 0]),
                  transform: [{ translateX: around(index, [width * 0.2, 0, -width * 0.2]) }],
                }}
              >
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>{t(`wel.${key}.title`)}</Text>
                <Text style={[styles.text, { color: theme.textMuted, textAlign: 'center' }]}>{t(`wel.${key}.text`)}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.dots}>
          {dotWidths.map((dotWidth, index) => (
            <Animated.View
              key={index}
              style={[styles.dotBase, { width: dotWidth, backgroundColor: index === page ? theme.primary : theme.border }]}
            />
          ))}
        </View>
        <Pressable
          onPress={goNext}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            last ? styles.ctaWide : styles.ctaRound,
          ]}
        >
          {last ? (
            <Text style={[styles.ctaText, { color: theme.primaryText }]}>{t('wel.start')}</Text>
          ) : (
            <Icon name="arrow-right" size={26} color={theme.primaryText} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function Setup() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const createAccount = useAccountsStore((state) => state.create);
  const createBudget = useBudgetsStore((state) => state.create);
  const keyboardHeight = useKeyboardHeight();

  const [step, setStep] = useState(0);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [budgetText, setBudgetText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const enter = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, enter]);

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
        await createAccount(db, { name: t(labelKey), type, icon: style.icon, color: style.color, openingBalanceMinor });
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

  const lastStep = step === SETUP_STEPS - 1;
  const heading: { icon: IconName; title: string; hint?: string } =
    step === 0
      ? { icon: 'cash-multiple', title: t('wel.currency') }
      : step === 1
        ? { icon: 'wallet-outline', title: t('wel.accountsTitle'), hint: t('wel.accountsHint') }
        : { icon: 'bullseye-arrow', title: t('wel.budgetTitle'), hint: t('wel.budgetHint') };

  return (
    <View style={styles.flex}>
      <View style={styles.progress}>
        {Array.from({ length: SETUP_STEPS }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, { backgroundColor: index <= step ? theme.primary : theme.border }]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.setupContent, { paddingBottom: 24 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            gap: 20,
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}
        >
          <View style={styles.heading}>
            <View style={[styles.headingIcon, { backgroundColor: theme.primary + '1A' }]}>
              <Icon name={heading.icon} size={34} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>{heading.title}</Text>
            {heading.hint ? (
              <Text style={[styles.text, { color: theme.textMuted, textAlign: 'center' }]}>{heading.hint}</Text>
            ) : null}
          </View>

          {step === 0 && (
            <View style={styles.currencyGrid}>
              {CURRENCY_OPTIONS.map((option) => {
                const selected = option.code === settings.currency;
                return (
                  <Pressable
                    key={option.code}
                    onPress={() => settings.setCurrency(db, option.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.currencyCard,
                      {
                        backgroundColor: selected ? theme.primary + '1A' : theme.surface,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: selected ? theme.primary : theme.text }}>
                      {option.code}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: theme.textMuted }} numberOfLines={1}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 1 && (
            <View style={{ gap: 12 }}>
              {STARTER_ACCOUNTS.map(({ type, labelKey }) => {
                const style = ACCOUNT_TYPE_STYLE[type];
                return (
                  <View
                    key={type}
                    style={[styles.accountCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={[styles.accountIcon, { backgroundColor: style.color + '22' }]}>
                      <Icon name={style.icon} size={24} color={style.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: theme.text }}>{t(labelKey)}</Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: theme.textMuted }}>
                        {t('wel.balance')}
                      </Text>
                    </View>
                    <View style={styles.balanceBox}>
                      <TextInput
                        value={formatAmountForInput(balances[type] ?? '')}
                        onChangeText={(text) =>
                          setBalances((current) => ({
                            ...current,
                            [type]: sanitizeAmountInput(text, current[type] ?? '', true),
                          }))
                        }
                        keyboardType="numbers-and-punctuation"
                        placeholder="0"
                        placeholderTextColor={theme.textMuted}
                        style={{ fontFamily: fonts.bold, fontSize: 18, color: theme.text, textAlign: 'right', minWidth: 90 }}
                      />
                      <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: theme.textMuted, textAlign: 'right' }}>
                        {settings.currency}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {step === 2 && (
            <View style={[styles.budgetBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: theme.textMuted }}>{t('wel.budgetLimit')}</Text>
              <AmountInput value={budgetText} onChangeText={setBudgetText} currency={settings.currency} />
            </View>
          )}

          {error && <Text style={{ color: theme.danger, textAlign: 'center' }}>{error}</Text>}
        </Animated.View>
      </ScrollView>

      <View style={styles.setupBar}>
        {step > 0 ? (
          <Pressable onPress={() => setStep(step - 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <View style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Icon name="arrow-left" size={24} color={theme.text} />
            </View>
          </Pressable>
        ) : (
          <View style={[styles.backButton, { opacity: 0 }]} />
        )}
        <Pressable
          onPress={lastStep ? finish : () => setStep(step + 1)}
          disabled={saving}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            styles.ctaWide,
            { flex: 1, backgroundColor: theme.primary, opacity: saving ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.primaryText }]}>{lastStep ? t('wel.finish') : t('common.next')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { height: 44, paddingHorizontal: 24, alignItems: 'flex-end', justifyContent: 'center' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logoCard: {
    width: 128,
    height: 128,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 36 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, marginTop: 6, maxWidth: 300 },
  label: { fontFamily: fonts.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 2,
  },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    minHeight: 84,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotBase: { height: 8, borderRadius: 4 },
  cta: { alignItems: 'center', justifyContent: 'center', height: 56 },
  ctaRound: { width: 56, borderRadius: 28 },
  ctaWide: { paddingHorizontal: 28, borderRadius: 28 },
  ctaText: { fontFamily: fonts.bold, fontSize: 16 },
  progress: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 16 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  setupContent: { padding: 24, paddingTop: 28 },
  heading: { alignItems: 'center', gap: 8 },
  headingIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  currencyCard: {
    width: '31%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    gap: 2,
  },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  accountIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  balanceBox: { alignItems: 'flex-end' },
  budgetBox: { alignItems: 'center', gap: 6, padding: 24, borderRadius: 20, borderWidth: 1 },
  setupBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  backButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

