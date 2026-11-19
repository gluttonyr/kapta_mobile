import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { getBackendUrl, setBackendUrl } from '@/api/client';
import {
  activateLicense,
  fetchLicenseStatus,
  kaptaLogin,
  type KaptaAccount,
  type LicenseView,
} from '@/api/kapta';
import { getDeviceId } from '@/session/device';
import { store } from '@/session/store';

const ACCOUNT_KEY = 'kapta_account';
const LICENSE_KEY = 'kapta_license';
// Without network the last answer is trusted this long, so a short outage does not stop the capture.
const OFFLINE_GRACE_MS = 3 * 24 * 60 * 60_000;
const CHECK_EVERY_MS = 60 * 60_000;
// "Votre licence expire bientôt" from this many days left.
export const EXPIRY_WARNING_DAYS = 5;

type CachedLicense = { view: LicenseView; checkedAt: number };

/** Why the phone cannot capture right now (null when it can). */
export type LicenseBlock = 'NON_ACTIVEE' | 'EXPIREE' | 'REVOQUEE' | 'HORS_LIGNE';

type LicenseState = {
  account: KaptaAccount | null;
  license: LicenseView | null;
  /** Date of the last answer from the Kapta server. */
  checkedAt: number | null;
  /** The client backend URL while the license may be used, else null. */
  backendUrl: string | null;
  block: LicenseBlock | null;
  daysLeft: number | null;
  loading: boolean;
  /** The last check failed for lack of network (the cached answer is used). */
  offline: boolean;
  signIn(email: string, password: string): Promise<void>;
  activate(code: string): Promise<void>;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
};

const Ctx = createContext<LicenseState | null>(null);

function computeBlock(cached: CachedLicense | null, now: number): LicenseBlock | null {
  if (!cached) return 'NON_ACTIVEE';
  const { view, checkedAt } = cached;
  if (!view.valid) return view.reason ?? 'NON_ACTIVEE';
  if (!view.expiresAt || new Date(view.expiresAt).getTime() <= now) return 'EXPIREE';
  if (now - checkedAt > OFFLINE_GRACE_MS) return 'HORS_LIGNE';
  return null;
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<KaptaAccount | null>(null);
  const [cached, setCached] = useState<CachedLicense | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Same value as `account`, readable from callbacks without re-creating them (updated with every setAccount).
  const accountRef = useRef<KaptaAccount | null>(null);

  const saveLicense = useCallback(async (view: LicenseView) => {
    const next = { view, checkedAt: Date.now() };
    setCached(next);
    setNow(next.checkedAt);
    setOffline(false);
    await store.set(LICENSE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    accountRef.current = null;
    setAccount(null);
    setCached(null);
    setOffline(false);
    await Promise.all([store.del(ACCOUNT_KEY), store.del(LICENSE_KEY)]).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const current = accountRef.current;
    if (!current) return;
    try {
      await saveLicense(await fetchLicenseStatus(current.token, await getDeviceId()));
    } catch (e: any) {
      const code = e?.response?.status;
      // Expired session or deactivated account/client: back to the Kapta sign-in.
      if (code === 401 || code === 403) await signOut();
      else setOffline(true);
      setNow(Date.now());
    }
  }, [saveLicense, signOut]);

  // Restore the stored account and last license answer, then check with the server.
  useEffect(() => {
    (async () => {
      try {
        const rawAccount = await store.get(ACCOUNT_KEY);
        const rawLicense = await store.get(LICENSE_KEY);
        if (rawAccount) {
          const restored: KaptaAccount = JSON.parse(rawAccount);
          accountRef.current = restored;
          setAccount(restored);
          if (rawLicense) setCached(JSON.parse(rawLicense));
        }
      } catch {
        // unreadable store: start signed out
      } finally {
        setLoading(false);
      }
      await refresh();
    })();
  }, [refresh]);

  // Check again every hour and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!account) return;
    const timer = setInterval(() => refresh().catch(() => {}), CHECK_EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh().catch(() => {});
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [account, refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await kaptaLogin(email, password);
    await store.set(ACCOUNT_KEY, JSON.stringify(next));
    await store.del(LICENSE_KEY).catch(() => {});
    accountRef.current = next;
    setAccount(next);
    setCached(null);
    await refresh();
  }, [refresh]);

  const activate = useCallback(async (code: string) => {
    const current = accountRef.current;
    if (!current) throw new Error('Connectez-vous d’abord à votre compte Kapta.');
    await saveLicense(await activateLicense(current.token, code.trim(), await getDeviceId()));
  }, [saveLicense]);

  const block = account ? computeBlock(cached, now) : 'NON_ACTIVEE';
  const backendUrl = account && !block ? cached?.view.client.backendUrl ?? null : null;
  const daysLeft = cached?.view.expiresAt && !block
    ? Math.max(0, Math.ceil((new Date(cached.view.expiresAt).getTime() - now) / (24 * 60 * 60_000)))
    : null;

  // Every call to the client's backend goes to the licensed URL, or nowhere. Set during render, not in an
  // effect: SessionProvider (a child, whose effects run first) starts the capture with it.
  if (getBackendUrl() !== backendUrl) setBackendUrl(backendUrl);

  const value = useMemo<LicenseState>(() => ({
    account,
    license: cached?.view ?? null,
    checkedAt: cached?.checkedAt ?? null,
    backendUrl,
    block,
    daysLeft,
    loading,
    offline,
    signIn,
    activate,
    refresh,
    signOut,
  }), [account, cached, backendUrl, block, daysLeft, loading, offline, signIn, activate, refresh, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLicense(): LicenseState {
  const s = useContext(Ctx);
  if (!s) throw new Error('useLicense must be used inside LicenseProvider');
  return s;
}
