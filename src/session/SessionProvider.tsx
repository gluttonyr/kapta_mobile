import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { loginRequest, type SessionUser } from '@/api/auth';
import { setAuthBridge } from '@/api/client';
import { refreshSenders, startCapture, stopCapture } from '@/capture/startCapture';
import { useLicense } from '@/license/LicenseProvider';
import { store } from './store';

export { store };

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
// The client backend this session belongs to: another client (new license) means signing in again.
const BACKEND_KEY = 'auth_backend';

type Session = {
  token: string | null;
  user: SessionUser | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
};

const Ctx = createContext<Session | null>(null);

// The admin session on the client's backend. It only works while the Kapta license gives that backend's URL.
export function SessionProvider({ children }: { children: ReactNode }) {
  const { backendUrl } = useLicense();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionBackend, setSessionBackend] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setAuthBridge(null, async () => {});
    setToken(null);
    setUser(null);
    setSessionBackend(null);
    // fire-and-forget: a hung or throwing native call must not delay logout
    (async () => stopCapture())().catch(() => {});
    await Promise.all([store.del(TOKEN_KEY), store.del(USER_KEY), store.del(BACKEND_KEY)]).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const t = await store.get(TOKEN_KEY);
        const u = await store.get(USER_KEY);
        const b = await store.get(BACKEND_KEY);
        const parsed: SessionUser | null = t && u ? JSON.parse(u) : null;
        if (t && b && parsed?.role === 'ADMIN') {
          setAuthBridge(t, signOut);
          setToken(t);
          setUser(parsed);
          setSessionBackend(b);
        } else if (t || u) {
          await signOut(); // stored session is not an admin one, or predates Kapta (no backend)
        }
      } catch {
        // unreadable store: start signed out
      } finally {
        setLoading(false);
      }
    })();
  }, [signOut]);

  // The license now points to another client: this session's token is not valid there, so the app
  // shows the sign-in again (signIn then replaces the stored session).
  const otherClient = !!(token && backendUrl && sessionBackend && sessionBackend !== backendUrl);
  const activeToken = otherClient ? null : token;

  // Capture runs only while signed in AND licensed; refresh senders at each app foreground.
  useEffect(() => {
    if (!activeToken) return;
    if (!backendUrl) {
      (async () => stopCapture())().catch(() => {}); // license expired, revoked, or unchecked for too long
      return;
    }
    startCapture().catch(() => {}); // unavailable off Android: Accueil shows it
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshSenders().catch(() => {});
    });
    return () => sub.remove();
  }, [activeToken, backendUrl]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!backendUrl) throw new Error('Licence Kapta inactive');
    const res = await loginRequest(email, password); // throws for non-admin: nothing is stored
    await store.set(TOKEN_KEY, res.token);
    await store.set(USER_KEY, JSON.stringify(res.user));
    await store.set(BACKEND_KEY, backendUrl);
    setAuthBridge(res.token, signOut);
    setToken(res.token);
    setUser(res.user);
    setSessionBackend(backendUrl);
  }, [backendUrl, signOut]);

  const value = useMemo(
    () => ({ token: activeToken, user: activeToken ? user : null, loading, signIn, signOut }),
    [activeToken, user, loading, signIn, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
