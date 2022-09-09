import library from './library';
let patches: Function[] = [];

export function deinitFilepickerPatches() {
  patches.forEach((unpatch) => unpatch());
}

export async function initFilepickerPatches() {
  patches.push(await library());
}
