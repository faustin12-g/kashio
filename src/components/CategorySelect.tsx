import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../constants/theme';
import { resolveCategoryIcon } from '../constants/categoryIcons';
import { categoryDisplayName } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useCategoriesStore } from '../store/categoriesStore';
import { filterCategoriesByName, hasCategoryNamed } from '../utils/categorySearch';
import { CategoryFormModal } from './CategoryFormModal';
import { Icon } from './Icon';
import type { Category, EntryType } from '../models/types';

interface CategorySelectProps {
  /** Categories to choose from, already limited to the right type (expense/income). */
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  /** Type given to a category created from the "Add new" option. */
  type: EntryType;
  /** Label for "nothing selected", e.g. "No category" or "Overall spending". */
  noneLabel?: string;
}

type Row = { kind: 'none' } | { kind: 'category'; category: Category };

/** Keeps the bottom sheet above the on-screen keyboard (Modal windows don't resize on their own). */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * A dropdown-style category field. Tapping it opens a sheet with a search box,
 * the matching categories, and an "Add new category" option that creates the
 * category and selects it straight away.
 */
export function CategorySelect({ categories, selectedId, onSelect, type, noneLabel }: CategorySelectProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const createCategory = useCategoriesStore((state) => state.create);
  const keyboardHeight = useKeyboardHeight();
  const emptyLabel = noneLabel ?? t('cat.none');

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState('');

  const selected = categories.find((category) => category.id === selectedId) ?? null;
  const trimmedQuery = query.trim();

  const rows = useMemo<Row[]>(() => {
    const matches = filterCategoriesByName(categories, query, (category) =>
      categoryDisplayName(category.name, t)
    ).map<Row>((category) => ({ kind: 'category', category }));
    return trimmedQuery ? matches : [{ kind: 'none' }, ...matches];
  }, [categories, query, trimmedQuery, t]);

  const closeSheet = () => {
    Keyboard.dismiss();
    setOpen(false);
    setQuery('');
  };

  const choose = (categoryId: string | null) => {
    onSelect(categoryId);
    closeSheet();
  };

  const startAdding = () => {
    setFormName(trimmedQuery);
    closeSheet();
    setFormOpen(true);
  };

  const addLabel =
    trimmedQuery && !hasCategoryNamed(categories, trimmedQuery)
      ? t('cat.addNamed', { name: trimmedQuery })
      : t('cat.addNew');

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('cat.select')}
        style={[styles.field, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        {selected ? (
          <View style={[styles.iconWrap, { backgroundColor: selected.color + '22' }]}>
            <Icon name={resolveCategoryIcon(selected.icon)} size={18} color={selected.color} />
          </View>
        ) : (
          <Icon name="tag-outline" size={20} color={theme.textMuted} />
        )}
        <Text style={[styles.fieldText, { color: selected ? theme.text : theme.textMuted }]} numberOfLines={1}>
          {selected ? categoryDisplayName(selected.name, t) : emptyLabel}
        </Text>
        <Icon name="chevron-down" size={22} color={theme.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} accessibilityLabel={t('common.close')} />
          <View style={[styles.sheet, { backgroundColor: theme.surface, marginBottom: keyboardHeight }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{t('cat.select')}</Text>
              <Pressable onPress={closeSheet} hitSlop={10} accessibilityLabel={t('common.close')}>
                <Icon name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.searchBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Icon name="magnify" size={20} color={theme.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('cat.search')}
                placeholderTextColor={theme.textMuted}
                autoCorrect={false}
                style={[styles.searchInput, { color: theme.text }]}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
                  <Icon name="close-circle" size={18} color={theme.textMuted} />
                </Pressable>
              )}
            </View>

            <FlatList
              data={rows}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(row) => (row.kind === 'none' ? 'none' : row.category.id)}
              style={styles.list}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('cat.noMatch')}</Text>
              }
              renderItem={({ item: row }) => {
                if (row.kind === 'none') {
                  return (
                    <Pressable onPress={() => choose(null)} style={styles.row}>
                      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceAlt }]}>
                        <Icon name="tag-off-outline" size={18} color={theme.textMuted} />
                      </View>
                      <Text style={[styles.rowText, { color: theme.text }]}>{emptyLabel}</Text>
                      {selectedId === null && <Icon name="check" size={20} color={theme.primary} />}
                    </Pressable>
                  );
                }
                const { category } = row;
                return (
                  <Pressable onPress={() => choose(category.id)} style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: category.color + '22' }]}>
                      <Icon name={resolveCategoryIcon(category.icon)} size={18} color={category.color} />
                    </View>
                    <Text style={[styles.rowText, { color: theme.text }]} numberOfLines={1}>
                      {categoryDisplayName(category.name, t)}
                    </Text>
                    {category.id === selectedId && <Icon name="check" size={20} color={theme.primary} />}
                  </Pressable>
                );
              }}
            />

            <Pressable
              onPress={startAdding}
              accessibilityRole="button"
              style={[styles.addRow, { borderTopColor: theme.border, paddingBottom: 16 + insets.bottom }]}
            >
              <Icon name="plus-circle-outline" size={22} color={theme.primary} />
              <Text style={[styles.addText, { color: theme.primary }]} numberOfLines={1}>
                {addLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {formOpen && (
        <CategoryFormModal
          visible
          initialName={formName}
          lockedType={type}
          onClose={() => setFormOpen(false)}
          onSubmit={async (input) => {
            const created = await createCategory(db, input);
            onSelect(created.id);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    height: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '500' },
  emptyText: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
