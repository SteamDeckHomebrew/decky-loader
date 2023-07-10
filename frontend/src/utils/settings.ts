export async function getSetting<T>(key: string, def: T): Promise<T> {
  const res = await window.DeckyPluginLoader.ws.call<[string, T], T>('utilities/settings/get', key, def);
  return res;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await window.DeckyPluginLoader.ws.call<[string, T], void>('utilities/settings/set', key, value);
}
