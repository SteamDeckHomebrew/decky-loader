interface GetSettingArgs<T> {
  key: string;
  default: T;
}

interface SetSettingArgs<T> {
  key: string;
  value: T;
}

export async function getSetting<T>(key: string, def: T): Promise<T> {
  const res = (await window.DeckyPluginLoader.callServerMethod('get_setting', {
    key,
    default: def,
  } as GetSettingArgs<T>)) as { result: T };
  return res.result;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await window.DeckyPluginLoader.callServerMethod('set_setting', {
    key,
    value,
  } as SetSettingArgs<T>);
}
