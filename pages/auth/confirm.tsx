import type { GetServerSidePropsContext } from 'next';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export default function AuthConfirmPage() {
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, res, query } = context;
  const supabase = createSupabaseServerClient(req, res);
  const next = String(query.next || '/dashboard');
  const safeNext = next.startsWith('/') ? next : '/dashboard';
  const code = String(query.code || '').trim();
  const tokenHash = String(query.token_hash || '').trim();
  const type = String(query.type || '').trim() as EmailOtpType;

  let error = false;

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    error = Boolean(exchangeError);
  } else if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    error = Boolean(verifyError);
  } else {
    error = true;
  }

  if (error) {
    return {
      redirect: {
        destination: '/auth/error',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: safeNext,
      permanent: false,
    },
  };
}
