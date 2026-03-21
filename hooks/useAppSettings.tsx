import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from './useLocale';

export type WeightUnit = 'kg' | 'lb';
export type DateFormat = 'dmy' | 'mdy';

export type AppSettings = {
  weightUnit: WeightUnit;
  dateFormat: DateFormat;
};

type AppSettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  setSettings: (next: AppSettings) => Promise<void>;
};

const SETTINGS_STORAGE_KEY = 'vpaw_app_settings';

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

function defaultsForLocale(locale: Locale): AppSettings {
  if (locale === 'tr') {
    return {
      weightUnit: 'kg',
      dateFormat: 'dmy',
    };
  }

  return {
    weightUnit: 'kg',
    dateFormat: 'mdy',
  };
}

export function AppSettingsProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const [settings, setSettingsState] = useState<AppSettings>(defaultsForLocale(locale));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (!raw) {
          setSettingsState(defaultsForLocale(locale));
          return;
        }

        try {
          const parsed = JSON.parse(raw) as Partial<AppSettings>;
          const next: AppSettings = {
            weightUnit: parsed.weightUnit === 'lb' ? 'lb' : 'kg',
            dateFormat: parsed.dateFormat === 'dmy' ? 'dmy' : 'mdy',
          };
          setSettingsState(next);
        } catch {
          setSettingsState(defaultsForLocale(locale));
        }
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [locale]);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      ready,
      async setSettings(next: AppSettings) {
        setSettingsState(next);
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      },
    }),
    [ready, settings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppSettingsProvider');
  return ctx;
}
