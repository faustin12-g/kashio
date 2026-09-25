import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../constants/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Shown in front of the text, e.g. a currency code. */
  prefix?: string;
}

/** A labelled text box in the app's style. */
export function TextField({ label, prefix, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.box, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        {prefix ? <Text style={[styles.prefix, { color: theme.textMuted }]}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={theme.textMuted}
          {...inputProps}
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
