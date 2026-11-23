import * as Linking from 'expo-linking';
import type { EmailOtpType } from '@supabase/supabase-js';

type CallbackRoute = 'auth-callback' | 'reset-password';
export const INVALID_AUTH_LINK = 'Þessi hlekkur er ógildur eða útrunninn. Óskaðu eftir nýjum hlekk.';

export function authRedirectUrl(route: CallbackRoute) {
  // Expo Go needs its current exp://host/--/path; installed builds use minfjarmal://path.
  return Linking.createURL(route);
}

function callbackRoute(url: URL): CallbackRoute | null {
  if (url.username || url.password) return null;
  for (const route of ['auth-callback', 'reset-password'] as const) {
    const expected = new URL(authRedirectUrl(route));
    if (
      url.protocol === expected.protocol && url.host === expected.host &&
      url.pathname.replace(/\/$/, '') === expected.pathname.replace(/\/$/, '')
    ) return route;
    if (url.protocol === 'minfjarmal:' &&
      `${url.host}${url.pathname}`.replace(/^\/+|\/+$/g, '') === route) return route;
  }
  return null;
}

export function parseAuthLink(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const route = callbackRoute(url);
  if (!route) return null;
  const query = url.searchParams;
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const param = (name: string) => {
    const values = [...query.getAll(name), ...fragment.getAll(name)];
    if (values.length > 1) throw new Error(INVALID_AUTH_LINK);
    return values[0] || null;
  };
  if (param('error') || param('error_code') || param('error_description')) {
    throw new Error(INVALID_AUTH_LINK);
  }
  const code = param('code');
  const tokenHash = param('token_hash');
  const accessToken = param('access_token');
  const refreshToken = param('refresh_token');
  const type = param('type');
  const recovery = route === 'reset-password' || type === 'recovery';
  if (route === 'reset-password' && type && type !== 'recovery') throw new Error(INVALID_AUTH_LINK);
  if (Number(Boolean(code)) + Number(Boolean(tokenHash)) + Number(Boolean(accessToken || refreshToken)) > 1) {
    throw new Error(INVALID_AUTH_LINK);
  }
  if (code) {
    const flowId = param('sb_flow_id');
    if (flowId && !/^[a-zA-Z0-9_-]{8,64}$/.test(flowId)) throw new Error(INVALID_AUTH_LINK);
    return { recovery, code, flowId };
  }
  if (tokenHash) {
    if (!type || !['signup', 'email', 'recovery', 'invite', 'magiclink'].includes(type)) {
      throw new Error(INVALID_AUTH_LINK);
    }
    return { recovery, tokenHash, type: type as EmailOtpType };
  }
  if (accessToken && refreshToken) return { recovery, accessToken, refreshToken };
  if (accessToken || refreshToken) throw new Error(INVALID_AUTH_LINK);
  // A bare reset route is also used to resume an already verified recovery session.
  return { recovery, empty: true };
}
