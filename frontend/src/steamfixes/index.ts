import reloadFix from './reload';
import restartFix from './restart';
let fixes: Function[] = [];

export function deinitSteamFixes() {
  fixes.forEach((deinit) => deinit());
}

export async function initSteamFixes() {
  fixes.push(await reloadFix());
  fixes.push(await restartFix());
}
