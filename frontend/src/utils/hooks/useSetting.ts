import { useEffect, useState } from 'react';

interface GetSettingArgs<T> {
  key: string;
  default: T;
}

interface SetSettingArgs<T> {
  key: string;
  value: T;
}

export function useSetting<T>(key: string, def: T): [value: T | null, setValue: (value: T) => Promise<void>] {
  const [value, setValue] = useState(def);

  useEffect(() => {
    (async () => {
      const res = (await window.DeckyPluginLoader.callServerMethod('get_setting', {
        key,
        default: def,
      } as GetSettingArgs<T>)) as { result: T };
      setValue(res.result);
    })();
  }, []);

  return [
    value,
    async (val: T) => {
      setValue(val);
      await window.DeckyPluginLoader.callServerMethod('set_setting', {
        key,
        value: val,
      } as SetSettingArgs<T>);
    },
  ];
}
