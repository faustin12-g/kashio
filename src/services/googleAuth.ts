import { GoogleSignin, isErrorWithCode, statusCodes, type User } from '@react-native-google-signin/google-signin';
import type { DriveAccount } from '../models/types';

/**
 * `drive.file` is the least-privileged Drive scope: the app can only see
 * and manage files/folders it itself creates, never browse the rest of the
 * user's Drive. That's what lets this run under Google's "unverified app"
 * testing limits without a lengthy OAuth verification review, and it's
 * also just the right amount of access for a backup file.
 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. Copy .env.example to .env and fill it in — ' +
        'see "Google Cloud setup" in README.md.'
    );
  }

  GoogleSignin.configure({
    webClientId,
    scopes: [DRIVE_SCOPE],
    offlineAccess: false, // no backend server, so no server auth code needed
  });
  configured = true;
}

/** `GoogleSignin` nests the actual profile fields under `.user` — this unwraps that. */
function toDriveAccount(response: User): DriveAccount {
  return {
    id: response.user.id,
    email: response.user.email,
    name: response.user.name,
    photoUrl: response.user.photo,
  };
}

/** Friendly error messages for the sign-in failure paths a user can actually hit. */
function describeSignInError(error: unknown): Error {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.IN_PROGRESS:
        return new Error('A sign-in is already in progress.');
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return new Error('Google Play Services is not available or needs an update on this device.');
      default:
        return new Error(error.message || 'Google sign-in failed.');
    }
  }
  return error instanceof Error ? error : new Error('Google sign-in failed.');
}

/**
 * Tries to restore a previous sign-in without showing any UI. Call this once
 * on app start. Returns null if the user has never signed in, or if the
 * saved session is no longer valid (they'll need to sign in again).
 */
export async function restoreSession(): Promise<DriveAccount | null> {
  ensureConfigured();
  if (!GoogleSignin.hasPreviousSignIn()) return null;

  try {
    const response = await GoogleSignin.signInSilently();
    return response.type === 'success' ? toDriveAccount(response.data) : null;
  } catch {
    // Saved credentials exist but are stale/revoked — treat as signed out
    // rather than surfacing an error on every cold start.
    return null;
  }
}

/** Shows the interactive Google sign-in UI and requests Drive access. */
export async function signIn(): Promise<DriveAccount> {
  ensureConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') {
      throw new Error('Sign-in was cancelled.');
    }
    return toDriveAccount(response.data);
  } catch (error) {
    throw describeSignInError(error);
  }
}

export async function signOut(): Promise<void> {
  ensureConfigured();
  await GoogleSignin.signOut();
}

export function getCurrentAccount(): DriveAccount | null {
  if (!configured) return null;
  const user = GoogleSignin.getCurrentUser();
  return user ? toDriveAccount(user) : null;
}

/**
 * Returns a fresh Drive access token. The native Google Sign-In SDK owns
 * refreshing under the hood, so this just needs to ask it — but if the
 * cached token has gone stale (e.g. the user revoked access from their
 * Google Account settings), we fall back to a single silent re-auth
 * attempt before giving up.
 */
export async function getAccessToken(): Promise<string> {
  ensureConfigured();
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    const silent = await GoogleSignin.signInSilently();
    if (silent.type === 'success') {
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    }
    throw describeSignInError(error);
  }
}
