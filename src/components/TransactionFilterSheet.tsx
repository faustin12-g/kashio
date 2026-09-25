import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { resolveCategoryIcon } from '../constants/categoryIcons';
import { categoryDisplayName } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { EMPTY_FILTER, type DatePreset, type FilterState } from '../services/txFilter';
import { todayIso } from '../utils/date';
import type { Account, Category } from '../models/types';
import { Button } from './Button';
import { DateField } from './DateField';
import { Icon, type IconName } from './Icon';
import { OptionField } from './OptionField';
import { SegmentedControl } from './SegmentedControl';
import { TextField } from './TextField';

interface TransactionFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  state: FilterState;
  onChange: (state: FilterState) => void;
  categories: Category[];
  accounts: Account[];
}

/** The filter options for the transaction list. Changes apply to the list straight away. */
export function TransactionFilterSheet({
  visible,
  onClose,
  state,
  onChange,
  categories,
  accounts,
}: TransactionFilterSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });

  const presets: { value: DatePreset; label: string }[] = [
    { value: 'all', label: t('common.all') },
    { value: 'month', label: t('home.thisMonth') },
    { value: 'last30', label: t('tx.last30') },
    { value: 'year', label: t('tx.thisYear') },
    { value: 'custom', label: t('tx.custom') },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{t('tx.filters')}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('common.close')}>
              <Icon name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.group}>
              <Text style={[styles.label, { color: theme.textMuted }]}>{t('tx.type')}</Text>
              <SegmentedControl
                value={state.type}
                onChange={(type) => set({ type })}
                options={[
                  { value: 'all', label: t('common.all') },
                  { value: 'expense', label: t('form.expense') },
                  { value: 'income', label: t('form.income') },
                ]}
              />
            </View>

            <OptionField
              label={t('tx.category')}
              title={t('cat.select')}
              value={state.categoryId}
              onChange={(categoryId) => set({ categoryId })}
              placeholder={t('tx.anyCategory')}
              noneLabel={t('tx.anyCategory')}
              options={categories.map((category) => ({
                id: category.id,
                label: categoryDisplayName(category.name, t),
                icon: resolveCategoryIcon(category.icon) as IconName,
                color: category.color,
              }))}
            />

            {accounts.length > 0 && (
              <OptionField
                label={t('tx.account')}
                title={t('acc.selectAccount')}
                value={state.accountId}
                onChange={(accountId) => set({ accountId })}
                placeholder={t('tx.anyAccount')}
                noneLabel={t('tx.anyAccount')}
                options={accounts.map((account) => ({
                  id: account.id,
                  label: account.name,
                  icon: account.icon as IconName,
                  color: account.color,
                }))}
              />
            )}

            <View style={styles.group}>
              <Text style={[styles.label, { color: theme.textMuted }]}>{t('tx.dates')}</Text>
              <View style={styles.chips}>
                {presets.map((preset) => {
                  const selected = preset.value === state.datePreset;
                  return (
                    <Pressable
                      key={preset.value}
                      onPress={() =>
                        set({
                          datePreset: preset.value,
                          ...(preset.value === 'custom' && !state.customFrom
                            ? { customFrom: todayIso(), customTo: todayIso() }
                            : {}),
                        })
                      }
                      style={[
                        styles.chip,
                        { backgroundColor: selected ? theme.primary : theme.surfaceAlt, borderColor: theme.border },
                      ]}
                    >
                      <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '600', fontSize: 13 }}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {state.datePreset === 'custom' && (
                <View style={styles.pair}>
                  <View style={styles.half}>
                    <DateField
                      label={t('tx.from')}
                      valueIso={state.customFrom ?? todayIso()}
                      onChange={(customFrom) => set({ customFrom })}
                    />
                  </View>
                  <View style={styles.half}>
                    <DateField
                      label={t('tx.to')}
                      valueIso={state.customTo ?? todayIso()}
                      onChange={(customTo) => set({ customTo })}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.group}>
              <Text style={[styles.label, { color: theme.textMuted }]}>{t('tx.amount')}</Text>
              <View style={styles.pair}>
                <View style={styles.half}>
                  <TextField
                    label={t('tx.min')}
                    value={state.minAmount}
                    onChangeText={(minAmount) => set({ minAmount: minAmount.replace(/[^0-9.,]/g, '') })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.half}>
                  <TextField
                    label={t('tx.max')}
                    value={state.maxAmount}
                    onChangeText={(maxAmount) => set({ maxAmount: maxAmount.replace(/[^0-9.,]/g, '') })}
                    keyboardType="decimal-pad"
                    placeholder="∞"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.half}>
              <Button
                label={t('tx.clearFilters')}
                variant="secondary"
                onPress={() => onChange({ ...EMPTY_FILTER, search: state.search })}
              />
            </View>
            <View style={styles.half}>
              <Button label={t('common.done')} onPress={onClose} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, maxHeight: '88%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingVertical: 8, gap: 18 },
  group: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
});
