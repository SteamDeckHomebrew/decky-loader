// QAM tab ids are reserved by Steam in the low range and by Decky at 999.
// Generate a stable id per plugin name that sits between the two, so a pinned
// plugin tab appears above the Decky tab in the QAM.
const MIN_ID = 100;
const MAX_ID = 998;

export function pinnedPluginTabId(name: string, reserved: Set<number>): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  let id = MIN_ID + (Math.abs(hash) % (MAX_ID - MIN_ID + 1));
  while (reserved.has(id)) {
    id = id + 1 > MAX_ID ? MIN_ID : id + 1;
  }
  return id;
}
