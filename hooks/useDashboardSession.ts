import { useEffect, useState } from 'react';
import type { NextRouter } from 'next/router';
import { logoutSession } from '../lib/api/dashboard';

export function useDashboardSession(router: NextRouter) {
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    setSessionReady(true);
  }, []);

  function resetSession() {
    setSessionReady(true);
  }

  async function logout() {
    try {
      await logoutSession();
    } catch {
      // We still clear the client flow even if the server session is gone.
    }

    resetSession();
    await router.push('/');
  }

  return {
    sessionReady,
    resetSession,
    logout,
  };
}
