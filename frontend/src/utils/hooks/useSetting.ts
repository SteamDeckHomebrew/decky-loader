import { useEffect, useState } from 'react';

interface GetSettingArgs<T> {
  key: string;
  default: T;
}

interface SetSettingArgs<T> {
  key: string;
  value: T;
}

export function useSetting<T>(key: string, def: T): [value: T | null, setValue: (value: T) => void] {
  const [value, setValue] = useState(def);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const res = (await window.DeckyPluginLoader.callServerMethod('get_setting', {
        key,
        default: def,
      } as GetSettingArgs<T>)) as { result: T };
      setReady(true);
      setValue(res.result);
    })();
  }, []);

  useEffect(() => {
    if (ready)
      (async () => {
        await window.DeckyPluginLoader.callServerMethod('set_setting', {
          key,
          value,
        } as SetSettingArgs<T>);
      })();
  }, [value]);

  return [value, setValue];
}
