import { randomUUID } from 'expo-crypto';

import { store } from './store';

const DEVICE_ID_KEY = 'kapta-device-id';

/** Stable per installation: the Kapta license and the client's capture token are bound to it. */
export async function getDeviceId(): Promise<string> {
  let id = await store.get(DEVICE_ID_KEY);
  if (!id) {
    id = randomUUID();
    await store.set(DEVICE_ID_KEY, id);
  }
  return id;
}
