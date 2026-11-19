import axios from 'axios';
import Constants from 'expo-constants';

// The Kapta license server (not the client's backend): accounts, activation codes, licenses.
// eslint-disable-next-line import/no-named-as-default-member
const kapta = axios.create({
  baseURL: Constants.expoConfig?.extra?.kaptaApiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export type KaptaAccount = { token: string; email: string; clientName: string };

export type LicenseReason = 'NON_ACTIVEE' | 'EXPIREE' | 'REVOQUEE';
export type LicenseView = {
  valid: boolean;
  reason: LicenseReason | null;
  expiresAt?: string;
  daysLeft?: number;
  /** backendUrl is given only while the license is valid. */
  client: { id?: string; name: string; backendUrl?: string };
  serverTime: string;
};

export async function kaptaLogin(email: string, password: string): Promise<KaptaAccount> {
  const res = await kapta.post('/auth/login', { email, password });
  return { token: res.data.accessToken, email: res.data.email, clientName: res.data.client.name };
}

export async function activateLicense(token: string, code: string, deviceId: string): Promise<LicenseView> {
  return (await kapta.post('/license/activate', { code, deviceId }, auth(token))).data;
}

export async function fetchLicenseStatus(token: string, deviceId: string): Promise<LicenseView> {
  return (await kapta.get('/license/status', { ...auth(token), params: { deviceId } })).data;
}

/** The server's message when there is one (French), else a generic one. */
export function kaptaErrorMessage(e: any, fallback: string): string {
  if (!e?.response) return 'Serveur Kapta injoignable : vérifiez la connexion Internet.';
  const message = e.response.data?.message;
  return (Array.isArray(message) ? message[0] : message) || fallback;
}
