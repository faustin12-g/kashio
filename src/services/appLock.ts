import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Whether the phone has any screen lock at all (fingerprint, face, PIN or
 * pattern). Without one there is nothing to unlock the app with.
 */
export async function isAppLockAvailable(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

/**
 * Asks the phone to confirm it is the owner, using whatever the phone offers:
 * fingerprint or face first, falling back to the PIN or pattern. Returns
 * whether the person passed.
 */
export async function authenticateOwner(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return result.success;
}

export { RELOCK_AFTER_MS, shouldLockOnReturn } from './lockRules';
