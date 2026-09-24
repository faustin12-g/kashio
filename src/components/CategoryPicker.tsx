import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import type { Category } from '../models/types';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

/** Horizontal scrolling chip list. Small enough lists (a dozen or so categories) that this beats a modal. */
export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  const theme = useTheme();

  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            onPress={() => onSelect(selected ? null : item.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? item.color : theme.surfaceAlt,
                borderColor: selected ? item.color : theme.border,
              },
            ]}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.label, { color: selected ? '#FFFFFF' : theme.text }]}>{item.name}</Text>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={{ color: theme.textMuted }}>No categories yet — add one in Categories.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  icon: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600' },
  emptyWrap: { paddingVertical: 8 },
});
