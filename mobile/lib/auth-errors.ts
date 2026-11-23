import { INVALID_AUTH_LINK } from '@/lib/auth-links';

export function authErrorMessage(error: unknown) {
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  if (message === INVALID_AUTH_LINK) return INVALID_AUTH_LINK;
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Netfang eða lykilorð er rangt.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Staðfestu netfangið þitt áður en þú skráir þig inn.';
  }
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'Aðgangur með þessu netfangi er þegar til.';
  }
  if (normalized.includes('expired') || normalized.includes('otp') || normalized.includes('code verifier') || normalized.includes('flow state')) {
    return 'Hlekkurinn er útrunninn eða var opnaður í öðru appi. Óskaðu eftir nýjum hlekk og opnaðu hann í sama síma.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many') || normalized.includes('after')) {
    return 'Of margar tilraunir. Bíddu í smástund og reyndu aftur.';
  }
  if (normalized.includes('same password')) {
    return 'Nýja lykilorðið þarf að vera annað en núverandi lykilorð.';
  }
  if (normalized.includes('password')) {
    return 'Lykilorðið uppfyllir ekki öryggiskröfurnar.';
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'Ekki náðist samband. Athugaðu nettenginguna og reyndu aftur.';
  }

  return 'Ekki tókst að ljúka aðgerðinni. Reyndu aftur.';
}
