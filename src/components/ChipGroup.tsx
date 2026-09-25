import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { Icon, type IconName } from './Icon';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Choices shown as pills that wrap onto more lines when they do not fit. */
export function ChipGroup<T extends string>({ options, value, onChange }: ChipGroupProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? theme.primaryText : theme.text;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              { backgroundColor: selected ? theme.primary : theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            {option.icon && <Icon name={option.icon} size={16} color={color} />}
            <Text style={{ color, fontWeight: '600', fontSize: 14 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
});
