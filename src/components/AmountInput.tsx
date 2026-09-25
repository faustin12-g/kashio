import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { formatAmountForInput, sanitizeAmountInput } from '../utils/money';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  currency: string;
  autoFocus?: boolean;
}

/** Free-text decimal entry (validated/parsed centrally in utils/money.ts). */
export function AmountInput({ value, onChangeText, currency, autoFocus }: AmountInputProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.currency, { color: theme.textMuted }]}>{currency}</Text>
      <TextInput
        value={formatAmountForInput(value)}
        onChangeText={(text) => onChangeText(sanitizeAmountInput(text, value))}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={theme.textMuted}
        autoFocus={autoFocus}
        style={[styles.input, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  currency: { fontSize: 20, fontWeight: '600' },
  input: { fontSize: 40, fontWeight: '700', minWidth: 120 },
});
