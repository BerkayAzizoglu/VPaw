import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import { LocaleProvider, useLocale } from './hooks/useLocale';
import { AppSettingsProvider } from './hooks/useAppSettings';
import AuthGate from './components/AuthGate';

function AppShell() {
  const { locale } = useLocale();

  return (
    <AppSettingsProvider locale={locale}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </AppSettingsProvider>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AppShell />
    </LocaleProvider>
  );
}
