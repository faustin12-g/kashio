import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';
import { Icon, type IconName } from './Icon';

export interface FieldOption {
  id: string;
  label: string;
  subtitle?: string;
  icon?: IconName;
  color?: string;
}

interface OptionFieldProps {
  /** Small caption above the field. */
  label?: string;
  /** Title of the sheet that opens. */
  title: string;
  options: FieldOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Shown when nothing is chosen. */
  placeholder: string;
  /** When given, the list starts with a row that clears the choice. */
  noneLabel?: string;
}

/** A dropdown-style field: tap it, pick one option from a sheet. */
export function OptionField({ label, title, options, value, onChange, placeholder, noneLabel }: OptionFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value) ?? null;

  const choose = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.field, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        {selected?.icon ? (
          <View style={[styles.iconWrap, { backgroundColor: (selected.color ?? theme.textMuted) + '22' }]}>
            <Icon name={selected.icon} size={18} color={selected.color ?? theme.textMuted} />
          </View>
        ) : null}
        <Text style={[styles.fieldText, { color: selected ? theme.text : theme.textMuted }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={22} color={theme.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />
          <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: 12 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel={t('common.close')}>
                <Icon name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>
            <FlatList
              data={[...(noneLabel ? [{ id: '__none__', label: noneLabel } as FieldOption] : []), ...options]}
              keyExtractor={(option) => option.id}
              renderItem={({ item }) => {
                const isNone = item.id === '__none__';
                const isSelected = isNone ? value === null : item.id === value;
                return (
                  <Pressable onPress={() => choose(isNone ? null : item.id)} style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: (item.color ?? theme.textMuted) + '22' }]}>
                      <Icon
                        name={isNone ? 'close-circle-outline' : (item.icon ?? 'circle-small')}
                        size={18}
                        color={item.color ?? theme.textMuted}
                      />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && <Icon name="check" size={20} color={theme.primary} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  fieldText: { flex: 1, fontSize: 15 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, maxHeight: '70%' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
});
