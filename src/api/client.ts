import axios from 'axios';

// The client's backend (e.g. JM Services). Its URL comes from the Kapta license, see setBackendUrl.
// eslint-disable-next-line import/no-named-as-default-member
const client = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

let backendUrl: string | null = null;
export const getBackendUrl = () => backendUrl;

// Called by LicenseProvider: set while the license is valid, null otherwise.
export function setBackendUrl(url: string | null) {
  backendUrl = url;
  client.defaults.baseURL = url ?? undefined;
}

let currentToken: string | null = null;
let onUnauthorized: () => Promise<void> = async () => {};

// Called by SessionProvider so the client always sees the current session.
export function setAuthBridge(token: string | null, signOut: () => Promise<void>) {
  currentToken = token;
  onUnauthorized = signOut;
}

client.interceptors.request.use((config) => {
  if (currentToken) config.headers.Authorization = `Bearer ${currentToken}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    // A 401 without a session is just a wrong password on /auth/login: only authenticated calls mean an expired session.
    if (error.response?.status === 401 && currentToken) {
      await onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default client;
