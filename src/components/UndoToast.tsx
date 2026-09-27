import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';
import { fonts } from '../constants/fonts';
import { useTranslation } from '../i18n/useTranslation';
import { useUndoStore } from '../store/undoStore';

const VISIBLE_MS = 5000;

/**
 * Mounted once at the root, above every screen, so a delete anywhere in the
 * app can offer a few seconds to undo it, even after navigating back from
 * wherever the delete happened.
 */
export function UndoToast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { message, onUndo, token, hide } = useUndoStore();
  const enter = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!message) return;
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingBottom: insets.bottom + 12, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: theme.scheme === 'dark' ? theme.surfaceAlt : '#12131A' }]}>
        <Text style={[styles.message, { color: '#FFFFFF' }]} numberOfLines={1}>
          {message}
        </Text>
        <Pressable
          onPress={() => {
            onUndo?.();
            hide();
          }}
          hitSlop={10}
        >
          <Text style={[styles.action, { color: theme.primary }]}>{t('common.undo')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  message: { flex: 1, fontSize: 14, fontFamily: fonts.semibold },
  action: { fontSize: 14, fontFamily: fonts.bold },
});
