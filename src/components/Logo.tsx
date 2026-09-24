import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';

const LOGO_BLUE = require('../../assets/logo-mark.png');
const LOGO_LIGHT = require('../../assets/logo-mark-light.png');

interface LogoProps {
  size?: number;
}

/** The brand mark. Uses a lighter blue variant on dark backgrounds so it stays readable. */
export function Logo({ size = 32 }: LogoProps) {
  const theme = useTheme();
  return (
    <Image
      source={theme.scheme === 'dark' ? LOGO_LIGHT : LOGO_BLUE}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="App logo"
    />
  );
}

/** Logo plus app name, used as the Home screen header title. */
export function BrandTitle() {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Logo size={26} />
      <Text style={[styles.name, { color: theme.text }]}>Buget</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 18, fontWeight: '800' },
});
