import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { Button } from './Button';
import type { EntryType } from '../models/types';

const COLOR_PRESETS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#3B82F6',
  '#6366F1',
  '#A855F7',
  '#EC4899',
  '#64748B',
];

interface CategoryFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; icon: string; color: string; type: EntryType }) => Promise<void>;
}

export function CategoryFormModal({ visible, onClose, onSubmit }: CategoryFormModalProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [type, setType] = useState<EntryType>('expense');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setIcon('🏷️');
    setColor(COLOR_PRESETS[0]);
    setType('expense');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), icon: icon.trim() || '🏷️', color, type });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text style={[styles.title, { color: theme.text }]}>New category</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textMuted }]}>Emoji</Text>
                <TextInput
                  value={icon}
                  onChangeText={setIcon}
                  maxLength={4}
                  style={[styles.iconInput, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                />
              </View>
              <View style={{ flex: 3 }}>
                <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Subscriptions"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.nameInput, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>Type</Text>
              <View style={styles.typeSwitch}>
                {(['expense', 'income'] as const).map((option) => {
                  const selected = option === type;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setType(option)}
                      style={[styles.typeButton, { backgroundColor: selected ? theme.primary : theme.surfaceAlt }]}
                    >
                      <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '700' }}>
                        {option === 'expense' ? 'Expense' : 'Income'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textMuted }]}>Color</Text>
              <View style={styles.colorRow}>
                {COLOR_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setColor(preset)}
                    style={[
                      styles.swatch,
                      { backgroundColor: preset, borderColor: preset === color ? theme.text : 'transparent' },
                    ]}
                  />
                ))}
              </View>
            </View>

            <Button label="Add category" onPress={handleSubmit} loading={saving} disabled={!name.trim()} />
            <Button label="Cancel" onPress={onClose} variant="secondary" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  iconInput: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 20, textAlign: 'center' },
  nameInput: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 15 },
  typeSwitch: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
});
