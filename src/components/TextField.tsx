import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../constants/theme';
import { formatAmountForInput, sanitizeAmountInput } from '../utils/money';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Shown in front of the text, e.g. a currency code. */
  prefix?: string;
  /**
   * Makes this an amount box: commas are added while typing (35000 shows as
   * 35,000) and `value` / `onChangeText` carry the plain text without commas.
   * Use "signed" when a minus sign is allowed.
   */
  amount?: boolean | 'signed';
}

/** A labelled text box in the app's style. */
export function TextField({ label, prefix, amount, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const amountProps = amount
    ? {
        value: formatAmountForInput(inputProps.value ?? ''),
        onChangeText: (text: string) => inputProps.onChangeText?.(sanitizeAmountInput(text, inputProps.value ?? '', amount === 'signed')),
      }
    : {};
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.box, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        {prefix ? <Text style={[styles.prefix, { color: theme.textMuted }]}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={theme.textMuted}
          {...inputProps}
          {...amountProps}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  prefix: { fontSize: 15, fontWeight: '600' },
  input: { flex: 1, paddingVertical: 12, fontSize: 15 },
});
