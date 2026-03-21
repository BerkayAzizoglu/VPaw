import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Locale = 'en' | 'tr';

type LocaleContextValue = {
  locale: Locale;
  ready: boolean;
  setLocale: (next: Locale) => Promise<void>;
};

const LOCALE_STORAGE_KEY = 'vpaw_app_locale';

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function getSystemLocale(): Locale {
  const resolved = Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase() ?? 'en';
  return resolved.startsWith('tr') ? 'tr' : 'en';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getSystemLocale());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (saved === 'tr' || saved === 'en') {
          setLocaleState(saved);
          return;
        }
        setLocaleState(getSystemLocale());
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      ready,
      async setLocale(next: Locale) {
        setLocaleState(next);
        await AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
      },
    }),
    [locale, ready],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
