import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '../constants/theme';
import { formatTime, parseTime } from '../services/reminders';
import { Icon } from './Icon';

interface TimeFieldProps {
  /** 24-hour "HH:mm". */
  value: string;
  onChange: (time: string) => void;
  label?: string;
}

/** Picks a time of day. Android shows a dialog; iOS shows an inline spinner. */
export function TimeField({ value, onChange, label }: TimeFieldProps) {
  const theme = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const { hour, minute } = parseTime(value);
  const date = new Date(2000, 0, 1, hour, minute);

  const handlePress = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        is24Hour: true,
        onChange: (_event, selected) => {
          if (selected) onChange(formatTime(selected.getHours(), selected.getMinutes()));
        },
      });
    } else {
      setIosOpen((open) => !open);
    }
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <Pressable
        onPress={handlePress}
        style={[styles.field, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        <Text style={{ color: theme.text, fontSize: 15, flex: 1 }}>{value}</Text>
        <Icon name="clock-outline" size={20} color={theme.textMuted} />
      </Pressable>
      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(_event, selected) => {
            if (selected) onChange(formatTime(selected.getHours(), selected.getMinutes()));
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
