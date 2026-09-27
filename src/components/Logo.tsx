import React from 'react';
import { Image } from 'react-native';
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
