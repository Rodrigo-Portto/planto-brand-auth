import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { serialize } from 'cookie';
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import { requireSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from './shared';

type CookieCapableRequest = NextApiRequest | GetServerSidePropsContext['req'];
type CookieCapableResponse = NextApiResponse | GetServerSidePropsContext['res'];

function readCookies(req: CookieCapableRequest) {
  return Object.entries(req.cookies || {}).map(([name, value]) => ({
    name,
    value: String(value ?? ''),
  }));
}

function appendSetCookieHeader(res: CookieCapableResponse, value: string) {
  const current = res.getHeader('Set-Cookie');

  if (!current) {
    res.setHeader('Set-Cookie', value);
    return;
  }

  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, value]);
    return;
  }

  res.setHeader('Set-Cookie', [String(current), value]);
}

export function createSupabaseServerClient(req: CookieCapableRequest, res: CookieCapableResponse) {
  requireSupabaseEnv();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return readCookies(req);
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          appendSetCookieHeader(
            res,
            serialize(name, value, {
              path: '/',
              sameSite: 'lax',
              ...options,
            })
          );
        });

        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      },
    },
  });
}

export async function getServerAuthenticatedUser(req: CookieCapableRequest, res: CookieCapableResponse): Promise<User | null> {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}
