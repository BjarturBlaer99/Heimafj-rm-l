import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { authErrorMessage } from '@/lib/auth-errors';
import { INVALID_AUTH_LINK, parseAuthLink } from '@/lib/auth-links';
import { hasSupabaseEnvironment, supabase, supabaseEnvironmentError } from '@/lib/supabase';

const recoveryStorageKey = 'minfjarmal.auth.recovery-user';
type AuthLinkStatus = 'idle' | 'processing' | 'success' | 'error';
type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configurationError: string | null;
  sessionError: string | null;
  isPasswordRecovery: boolean;
  authLinkStatus: AuthLinkStatus;
  authLinkError: string | null;
  finishPasswordRecovery: () => Promise<void>;
  cancelPasswordRecovery: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(hasSupabaseEnvironment);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [authLinkStatus, setAuthLinkStatus] = useState<AuthLinkStatus>('idle');
  const [authLinkError, setAuthLinkError] = useState<string | null>(null);
  const recoveryRef = useRef(false);
  const storageQueue = useRef(Promise.resolve());

  const rememberRecovery = useCallback((userId: string | null) => {
    // Serialize writes so a late recovery event cannot restore a cancelled marker.
    storageQueue.current = storageQueue.current
      .then(() => userId ? AsyncStorage.setItem(recoveryStorageKey, userId) : AsyncStorage.removeItem(recoveryStorageKey))
      .catch(() => {});
    return storageQueue.current;
  }, []);

  const finishPasswordRecovery = useCallback(async () => {
    await rememberRecovery(null);
    recoveryRef.current = false;
    setIsPasswordRecovery(false);
    setAuthLinkStatus('idle');
    setAuthLinkError(null);
  }, [rememberRecovery]);

  const cancelPasswordRecovery = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    await finishPasswordRecovery();
  }, [finishPasswordRecovery]);

  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    let active = true;
    let currentSession: Session | null = null;
    let authRevision = 0;
    let recoveryEvents = 0;
    const handledUrls = new Set<string>();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event !== 'INITIAL_SESSION') authRevision += 1;
      currentSession = nextSession;
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        recoveryEvents += 1;
        recoveryRef.current = true;
        setIsPasswordRecovery(true);
        void rememberRecovery(nextSession?.user.id ?? null);
      } else if (event === 'SIGNED_OUT') {
        recoveryRef.current = false;
        setIsPasswordRecovery(false);
        void rememberRecovery(null);
      }
    });

    async function handleUrl(url: string | null) {
      if (!active || !url || handledUrls.has(url)) return;
      const previousRecovery = recoveryRef.current;
      const previousRecoveryEvents = recoveryEvents;
      try {
        const link = parseAuthLink(url);
        if (!link) return;
        handledUrls.add(url);
        if (handledUrls.size > 8) handledUrls.delete(handledUrls.values().next().value!);
        if ('empty' in link) {
          if (link.recovery && recoveryRef.current && currentSession) return;
          throw new Error(INVALID_AUTH_LINK);
        }
        setAuthLinkStatus('processing');
        setAuthLinkError(null);
        if (link.recovery) {
          recoveryRef.current = true;
          setIsPasswordRecovery(true);
        }
        const result = 'code' in link
          ? await supabase.auth.exchangeCodeForSession(link.code!, link.flowId ? { flowId: link.flowId } : undefined)
          : 'tokenHash' in link
            ? await supabase.auth.verifyOtp({ token_hash: link.tokenHash!, type: link.type! })
            : await supabase.auth.setSession({ access_token: link.accessToken!, refresh_token: link.refreshToken! });
        if (result.error) throw result.error;
        if (!result.data.session) throw new Error(INVALID_AUTH_LINK);
        if (!active) return;
        currentSession = result.data.session;
        setSession(currentSession);
        recoveryRef.current = link.recovery || recoveryEvents > previousRecoveryEvents;
        setIsPasswordRecovery(recoveryRef.current);
        await rememberRecovery(recoveryRef.current ? currentSession.user.id : null);
        if (active) setAuthLinkStatus('success');
      } catch (error) {
        if (!active) return;
        handledUrls.delete(url);
        recoveryRef.current = previousRecovery;
        setIsPasswordRecovery(previousRecovery);
        setAuthLinkError(authErrorMessage(error));
        setAuthLinkStatus('error');
      }
    }

    const initialize = (async () => {
      try {
        const revision = authRevision;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const recoveryUser = await AsyncStorage.getItem(recoveryStorageKey);
        if (!active) return;
        if (revision === authRevision) {
          currentSession = data.session;
          setSession(data.session);
        }
        // Token refresh during restoration must not discard the recovery marker.
        recoveryRef.current = recoveryRef.current || Boolean(currentSession && recoveryUser === currentSession.user.id);
        setIsPasswordRecovery(recoveryRef.current);
      } catch {
        if (active) setSessionError('Ekki tókst að endurheimta vistuðu innskráninguna. Reyndu að skrá þig inn aftur.');
      }
      try {
        await handleUrl(await Linking.getInitialURL());
      } catch {
        if (active) {
          setAuthLinkError(INVALID_AUTH_LINK);
          setAuthLinkStatus('error');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    let linkQueue = initialize;
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      linkQueue = linkQueue.then(() => handleUrl(url));
    });
    const updateRefresh = () => {
      if (AppState.currentState === 'active') void supabase.auth.startAutoRefresh().catch(() => {});
      else void supabase.auth.stopAutoRefresh().catch(() => {});
    };
    const appStateSubscription = Platform.OS !== 'web'
      ? AppState.addEventListener('change', updateRefresh) : null;
    if (Platform.OS !== 'web') updateRefresh();

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      linkingSubscription.remove();
      appStateSubscription?.remove();
      if (Platform.OS !== 'web') void supabase.auth.stopAutoRefresh().catch(() => {});
    };
  }, [rememberRecovery]);

  const value = useMemo<AuthContextValue>(() => ({
    session, user: session?.user ?? null, loading,
    configurationError: supabaseEnvironmentError, sessionError,
    isPasswordRecovery, authLinkStatus, authLinkError,
    finishPasswordRecovery, cancelPasswordRecovery,
  }), [session, loading, sessionError, isPasswordRecovery, authLinkStatus, authLinkError, finishPasswordRecovery, cancelPasswordRecovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
