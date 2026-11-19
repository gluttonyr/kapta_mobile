import { randomUUID } from 'expo-crypto';

import { store } from './store';

// Kept from Mati-Pay so an updated phone keeps its id.
const DEVICE_ID_KEY = 'mati-pay-device-id';

/** Stable per installation: the Kapta license and the client's capture token are bound to it. */
export async function getDeviceId(): Promise<string> {
  let id = await store.get(DEVICE_ID_KEY);
  if (!id) {
    id = randomUUID();
    await store.set(DEVICE_ID_KEY, id);
  }
  return id;
}
