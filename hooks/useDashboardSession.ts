import { useEffect, useState } from 'react';
import type { NextRouter } from 'next/router';
import { clearStoredSession, getStoredAccessToken } from '../lib/domain/session';

export function useDashboardSession(router: NextRouter) {
  const [token, setToken] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const accessToken = getStoredAccessToken();
    if (!accessToken) {
      router.replace('/');
      setSessionReady(true);
      return;
    }

    setToken(accessToken);
    setSessionReady(true);
  }, [router]);

  function resetSession() {
    clearStoredSession();
    setToken('');
  }

  function logout() {
    resetSession();
    router.push('/');
  }

  return {
    token,
    sessionReady,
    resetSession,
    logout,
  };
}
