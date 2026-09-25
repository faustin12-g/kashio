import type { ExpoConfig, ConfigContext } from 'expo/config';

// Expo CLI loads .env / .env.local automatically before evaluating this file,
// so these just read whatever is already in process.env at config time.
// See .env.example and README.md ("Google Cloud setup") for where these
// values come from — none of them are secrets, they're public OAuth client
// identifiers, but they're per-developer so they don't belong hardcoded here.
//
// The google-signin config plugin hard-fails `expo prebuild`/`expo install`
// if `iosUrlScheme` is missing entirely, so an unset env var falls back to
// an inert placeholder here rather than leaving the key out — that keeps
// the project runnable (Android works, iOS sign-in just won't yet) before
// a developer has created their own Google Cloud OAuth clients. The actual
// "you haven't configured this" error surfaces at sign-in time instead,
// from services/googleAuth.ts, where it's actionable.
const GOOGLE_IOS_URL_SCHEME =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.not-configured-yet';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kashio',
  slug: 'kashio',
  scheme: 'kashio',
  version: '1.2.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: 'com.kashio.app',
  },
  android: {
    ...config.android,
    package: 'com.kashio.app',
    versionCode: 4,
    adaptiveIcon: {
      backgroundColor: '#FAF7F3',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    ...config.web,
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    '@react-native-vector-icons/material-design-icons',
    'expo-sharing',
    'expo-background-task',
    ['expo-local-authentication', { faceIDPermission: 'Kashio uses Face ID to keep your money private.' }],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#1541E7',
        defaultChannel: 'budget-alerts',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: '#FAF7F3',
        dark: {
          image: './assets/splash-icon-dark.png',
          backgroundColor: '#0B0C10',
        },
      },
    ],
    ['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
