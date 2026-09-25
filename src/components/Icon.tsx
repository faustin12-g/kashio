import React from 'react';
import type { ColorValue } from 'react-native';
import {
  MaterialDesignIcons,
  type MaterialDesignIconsIconName,
} from '@react-native-vector-icons/material-design-icons';

export type IconName = MaterialDesignIconsIconName;

interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

/**
 * The app's single icon component (Material Design Icons). Screens import
 * this instead of the icon package directly, so the icon set can be swapped
 * in one place.
 */
export function Icon({ name, size = 20, color }: IconProps) {
  return <MaterialDesignIcons name={name} size={size} color={color} />;
}
