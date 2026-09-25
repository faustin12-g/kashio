import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '../constants/theme';
import { formatDateForLanguage } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { fromIsoDate, toIsoDate } from '../utils/date';
import { Icon } from './Icon';

interface DateFieldProps {
  valueIso: string;
  onChange: (iso: string) => void;
  /** When set, the field can be emptied and this text is shown for "no date". */
  emptyLabel?: string;
  /** Caption above the field. */
  label?: string;
  onClear?: () => void;
  /** Whether a value is set; only meaningful together with `emptyLabel`. */
  hasValue?: boolean;
}

/**
 * Android shows its picker as an imperative dialog; iOS has no equivalent
 * API so we toggle an inline spinner instead. Both end up calling the same
 * `onChange(iso)`.
 */
export function DateField({ valueIso, onChange, emptyLabel, label, onClear, hasValue = true }: DateFieldProps) {
  const theme = useTheme();
  const { language } = useTranslation();
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const date = fromIsoDate(valueIso);
  const showEmpty = emptyLabel !== undefined && !hasValue;

  const handlePress = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        onChange: (_event, selected) => {
          if (selected) onChange(toIsoDate(selected));
        },
      });
    } else {
      setIosPickerOpen((open) => !open);
    }
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <Pressable
        onPress={handlePress}
        style={[styles.field, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        <Text style={{ color: showEmpty ? theme.textMuted : theme.text, fontSize: 15, flex: 1 }}>
          {showEmpty ? emptyLabel : formatDateForLanguage(valueIso, language)}
        </Text>
        {onClear && hasValue ? (
          <Pressable onPress={onClear} hitSlop={10}>
            <Icon name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        ) : (
          <Icon name="calendar-month-outline" size={20} color={theme.textMuted} />
        )}
      </Pressable>
      {Platform.OS === 'ios' && iosPickerOpen && (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          onChange={(_event, selected) => {
            if (selected) onChange(toIsoDate(selected));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
