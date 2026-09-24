import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '../constants/theme';
import { formatDisplayDate, fromIsoDate, toIsoDate } from '../utils/date';

interface DateFieldProps {
  valueIso: string;
  onChange: (iso: string) => void;
}

/**
 * Android shows its picker as an imperative dialog; iOS has no equivalent
 * API so we toggle an inline spinner instead. Both end up calling the same
 * `onChange(iso)`.
 */
export function DateField({ valueIso, onChange }: DateFieldProps) {
  const theme = useTheme();
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const date = fromIsoDate(valueIso);

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
    <View>
      <Pressable
        onPress={handlePress}
        style={[styles.field, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        <Text style={{ color: theme.text, fontSize: 15 }}>{formatDisplayDate(valueIso)}</Text>
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
  field: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
});
