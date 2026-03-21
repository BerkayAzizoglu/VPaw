import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import AuthGate from './components/AuthGate';

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
