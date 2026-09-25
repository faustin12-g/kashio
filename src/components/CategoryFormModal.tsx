import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { CATEGORY_ICON_OPTIONS, DEFAULT_CATEGORY_ICON } from '../constants/categoryIcons';
import { useTranslation } from '../i18n/useTranslation';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import type { EntryType } from '../models/types';

const COLOR_PRESETS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#3B82F6',
  '#6366F1',
  '#A855F7',
  '#EC4899',
  '#64748B',
];

interface CategoryFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-fills the name field, e.g. with whatever was typed in a search box. */
  initialName?: string;
  /** When set, the category type is fixed and the Expense/Income switch is hidden. */
  lockedType?: EntryType;
  onSubmit: (input: { name: string; icon: IconName; color: string; type: EntryType }) => Promise<void>;
}

export function CategoryFormModal({
  visible,
  onClose,
  onSubmit,
  initialName = '',
  lockedType,
}: CategoryFormModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<IconName>(DEFAULT_CATEGORY_ICON);
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [type, setType] = useState<EntryType>(lockedType ?? 'expense');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setIcon(DEFAULT_CATEGORY_ICON);
    setColor(COLOR_PRESETS[0]);
    setType(lockedType ?? 'expense');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), icon, color, type });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <ScrollView contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: theme.text }]}>{t('cat.newTitle')}</Text>

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>{t('cat.name')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('cat.namePlaceholder')}
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.nameInput,
                  { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
              />
            </View>

            {!lockedType && (
              <View>
                <Text style={[styles.label, { color: theme.textMuted }]}>{t('cat.type')}</Text>
                <View style={styles.typeSwitch}>
                  {(['expense', 'income'] as const).map((option) => {
                    const selected = option === type;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setType(option)}
                        style={[styles.typeButton, { backgroundColor: selected ? theme.primary : theme.surfaceAlt }]}
                      >
                        <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '700' }}>
                          {option === 'expense' ? t('cat.expenseTab') : t('cat.incomeTab')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>{t('cat.icon')}</Text>
              <View style={styles.iconGrid}>
                {CATEGORY_ICON_OPTIONS.map((option) => {
                  const selected = option === icon;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setIcon(option)}
                      accessibilityRole="button"
                      accessibilityLabel={option}
                      style={[
                        styles.iconCell,
                        {
                          backgroundColor: selected ? color : theme.surfaceAlt,
                          borderColor: selected ? color : theme.border,
                        },
                      ]}
                    >
                      <Icon name={option} size={22} color={selected ? '#FFFFFF' : theme.text} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>{t('cat.color')}</Text>
              <View style={styles.colorRow}>
                {COLOR_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setColor(preset)}
                    style={[
                      styles.swatch,
                      { backgroundColor: preset, borderColor: preset === color ? theme.text : 'transparent' },
                    ]}
                  />
                ))}
              </View>
            </View>

            <Button label={t('cat.add')} onPress={handleSubmit} loading={saving} disabled={!name.trim()} />
            <Button label={t('common.cancel')} onPress={onClose} variant="secondary" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  nameInput: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 15 },
  typeSwitch: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
});
