import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { fonts } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';

const SUPPORT_EMAIL = 'info@iwhda.org';

export default function ContactScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const handleEmail = () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('contact.subject'))}`;
    Linking.openURL(url).catch(() => Alert.alert(t('contact.noMailAppTitle'), t('contact.noMailAppMessage')));
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(SUPPORT_EMAIL);
    Alert.alert(t('contact.copiedTitle'));
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('contact.title') }} />
      <Text style={{ color: theme.textMuted }}>{t('contact.intro')}</Text>

      <Pressable
        onPress={handleCopy}
        style={[styles.emailRow, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        <Icon name="email-outline" size={20} color={theme.primary} />
        <Text style={{ flex: 1, color: theme.text, fontFamily: fonts.semibold, fontSize: 15 }}>{SUPPORT_EMAIL}</Text>
        <Icon name="content-copy" size={18} color={theme.textMuted} />
      </Pressable>

      <Button label={t('contact.emailButton')} onPress={handleEmail} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
});
