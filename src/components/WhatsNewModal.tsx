import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { fonts } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';
import type { ReleaseNote } from '../constants/releaseNotes';

interface WhatsNewModalProps {
  note: ReleaseNote | null;
  onClose: () => void;
}

/** A short, dismissible "what's new" shown once after an update — not on a fresh install, which already has the welcome tour. */
export function WhatsNewModal({ note, onClose }: WhatsNewModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();

  return (
    <Modal visible={note !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, paddingBottom: 20 + insets.bottom }]}>
          <View style={styles.header}>
            <Logo size={40} />
            <Text style={[styles.title, { color: theme.text }]}>{t('whatsNew.title')}</Text>
          </View>
          <View style={{ gap: 14 }}>
            {note?.lines[language].map((line, index) => (
              <View key={index} style={styles.row}>
                <Icon name="check-circle-outline" size={18} color={theme.primary} />
                <Text style={[styles.line, { color: theme.text }]}>{line}</Text>
              </View>
            ))}
          </View>
          <Button label={t('common.done')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 20 },
  header: { alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontFamily: fonts.extrabold },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  line: { flex: 1, fontSize: 15, fontFamily: fonts.regular, lineHeight: 21 },
});
