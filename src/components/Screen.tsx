import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

/** Common screen chrome: theme background, safe-area insets, optional scrolling. */
export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Container
        style={styles.flex}
        contentContainerStyle={scroll ? [styles.content, contentStyle] : undefined}
        {...(scroll ? { keyboardShouldPersistTaps: 'handled' as const } : {})}
      >
        {scroll ? children : <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
});
