import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface NotificationPreferences {
  poolSettled: boolean;
  disputeFiled: boolean;
  claimAvailable: boolean;
  poolExpiring: boolean;
}

const PREFERENCES_KEY = 'predinex_notification_preferences_v1';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  poolSettled: true,
  disputeFiled: true,
  claimAvailable: true,
  poolExpiring: true,
};

function normalizePreferences(prefs: unknown): NotificationPreferences {
  if (typeof prefs !== 'object' || prefs === null) {
    return { ...DEFAULT_PREFERENCES };
  }

  const obj = prefs as Record<string, unknown>;
  return {
    poolSettled: typeof obj.poolSettled === 'boolean' ? obj.poolSettled : DEFAULT_PREFERENCES.poolSettled,
    disputeFiled: typeof obj.disputeFiled === 'boolean' ? obj.disputeFiled : DEFAULT_PREFERENCES.disputeFiled,
    claimAvailable: typeof obj.claimAvailable === 'boolean' ? obj.claimAvailable : DEFAULT_PREFERENCES.claimAvailable,
    poolExpiring: typeof obj.poolExpiring === 'boolean' ? obj.poolExpiring : DEFAULT_PREFERENCES.poolExpiring,
  };
}

export function useNotificationPreferences() {
  const [storedPrefs, setStoredPrefs, clearStoredPrefs] = useLocalStorage<NotificationPreferences>(
    PREFERENCES_KEY,
    { ...DEFAULT_PREFERENCES }
  );

  const preferences = useMemo(() => normalizePreferences(storedPrefs), [storedPrefs]);

  const updatePreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      setStoredPrefs((prev) => ({
        ...normalizePreferences(prev),
        [key]: value,
      }));
    },
    [setStoredPrefs]
  );

  const togglePreference = useCallback(
    (key: keyof NotificationPreferences) => {
      updatePreference(key, !preferences[key]);
    },
    [preferences, updatePreference]
  );

  const resetToDefaults = useCallback(() => {
    clearStoredPrefs();
  }, [clearStoredPrefs]);

  const allEnabled = useMemo(
    () => Object.values(preferences).every((v) => v === true),
    [preferences]
  );

  const allDisabled = useMemo(
    () => Object.values(preferences).every((v) => v === false),
    [preferences]
  );

  return {
    preferences,
    updatePreference,
    togglePreference,
    resetToDefaults,
    allEnabled,
    allDisabled,
  };
}
