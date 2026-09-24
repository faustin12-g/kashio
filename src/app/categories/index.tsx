import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { CategoryFormModal } from '../../components/CategoryFormModal';
import { useTheme, spacing } from '../../constants/theme';
import { useCategoriesStore } from '../../store/categoriesStore';
import type { EntryType } from '../../models/types';

export default function CategoriesScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const categories = useCategoriesStore((state) => state.categories);
  const load = useCategoriesStore((state) => state.load);
  const create = useCategoriesStore((state) => state.create);
  const archive = useCategoriesStore((state) => state.archive);

  const [tab, setTab] = useState<EntryType>('expense');
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  const visible = useMemo(
    () => categories.filter((category) => category.type === tab && !category.isArchived),
    [categories, tab]
  );

  return (
    <Screen scroll={false}>
      <View style={styles.tabs}>
        {(['expense', 'income'] as const).map((option) => {
          const selected = option === tab;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              style={[styles.tab, { backgroundColor: selected ? theme.primary : theme.surfaceAlt }]}
            >
              <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '700' }}>
                {option === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            <Pressable onPress={() => archive(db, item.id)} hitSlop={8}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Archive</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="🏷️" title="No categories in this list" message="Add one below." />}
      />

      <View style={styles.footer}>
        <Button label="Add category" onPress={() => setModalVisible(true)} />
      </View>

      <CategoryFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (input) => {
          await create(db, input);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, padding: spacing.lg, paddingBottom: 0 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  list: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  footer: { padding: spacing.lg },
});
