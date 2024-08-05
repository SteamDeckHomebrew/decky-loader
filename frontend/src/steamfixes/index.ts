// import restartFix from './restart';
import cefSocketFix from "./socket";

let fixes: Function[] = [];

export function deinitSteamFixes() {
  fixes.forEach((deinit) => deinit());
}

export async function initSteamFixes() {
  fixes.push(cefSocketFix());
  // fixes.push(await restartFix());
}
