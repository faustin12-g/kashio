import React from 'react';
import { ActionSheetIOS, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../constants/theme';
import { fonts } from '../constants/fonts';
import { useTranslation } from '../i18n/useTranslation';
import { Icon } from './Icon';

interface ReceiptFieldProps {
  /** A local file URI (picked or already saved), or null when there is no photo. */
  uri: string | null;
  onChange: (uri: string | null) => void;
}

/** Lets a transaction carry a photo of its receipt: take one now, or pick one already on the phone. */
export function ReceiptField({ uri, onChange }: ReceiptFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('form.receiptPermissionTitle'), t('form.receiptCameraDenied'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) onChange(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('form.receiptPermissionTitle'), t('form.receiptLibraryDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) onChange(result.assets[0].uri);
  };

  const choose = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('form.receiptTakePhoto'), t('form.receiptChooseFromLibrary')],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void takePhoto();
          else if (index === 2) void pickFromLibrary();
        }
      );
    } else {
      Alert.alert(t('form.receipt'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('form.receiptTakePhoto'), onPress: () => void takePhoto() },
        { text: t('form.receiptChooseFromLibrary'), onPress: () => void pickFromLibrary() },
      ]);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{t('form.receipt')}</Text>
      {uri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri }} style={[styles.preview, { borderColor: theme.border }]} />
          <Pressable
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel={t('form.receiptRemove')}
            style={[styles.removeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Icon name="close" size={16} color={theme.text} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={choose}
          accessibilityRole="button"
          style={[styles.addButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        >
          <Icon name="camera-plus-outline" size={20} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, fontFamily: fonts.semibold, fontSize: 14 }}>
            {t('form.receiptAdd')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewWrap: { alignSelf: 'flex-start' },
  preview: { width: 96, height: 96, borderRadius: 12, borderWidth: 1 },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
