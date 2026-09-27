import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { WhatsNewModal } from './WhatsNewModal';
import { RELEASE_NOTES, type ReleaseNote } from '../constants/releaseNotes';
import { getMeta, setMeta, META_KEYS } from '../repositories/metaRepository';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Shows a short "what's new" once per update — never on a fresh install,
 * which already gets the welcome tour instead. Silently does nothing if the
 * version jumped to one with no release note, or the version can't be read.
 */
export function WhatsNewGate() {
  const db = useSQLiteContext();
  const onboardingDone = useSettingsStore((state) => state.onboardingDone);
  const [note, setNote] = useState<ReleaseNote | null>(null);

  useEffect(() => {
    if (!onboardingDone) return;
    const currentVersion = Constants.expoConfig?.version;
    if (!currentVersion) return;

    let cancelled = false;
    getMeta(db, META_KEYS.lastSeenVersion).then((lastSeenVersion) => {
      if (cancelled || lastSeenVersion === currentVersion) return;
      // Onboarding stamps this the moment it completes, so a fresh install is already
      // caught up here. Anything else — including no stored version at all, from an
      // install that predates this feature — genuinely has something new to show.
      const match = RELEASE_NOTES.find((entry) => entry.version === currentVersion);
      if (match) setNote(match);
      void setMeta(db, META_KEYS.lastSeenVersion, currentVersion);
    });
    return () => {
      cancelled = true;
    };
  }, [db, onboardingDone]);

  return <WhatsNewModal note={note} onClose={() => setNote(null)} />;
}
