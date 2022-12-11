import { useEffect, useState } from 'react';

import { getSetting, setSetting } from '../settings';

const settingUpdates = new EventTarget();

export function useSetting<T>(key: string, def: T): [value: T, setValue: (value: T) => Promise<void>] {
  const [value, setValue] = useState(def);

  useEffect(() => {
    (async () => {
      const res = await getSetting<T>(key, def);
      setValue(res);
    })();
  }, []);

  useEffect(() => {
    function listener(event: Event) {
      if (event instanceof CustomEvent) {
        setValue(event.detail);
      }
    }
    settingUpdates.addEventListener(key, listener);
    return () => settingUpdates.removeEventListener(key, listener);
  });

  return [
    value,
    async (val: T) => {
      setValue(val);
      await setSetting(key, val);
      settingUpdates.dispatchEvent(new CustomEvent(key, { detail: val }));
    },
  ];
}
