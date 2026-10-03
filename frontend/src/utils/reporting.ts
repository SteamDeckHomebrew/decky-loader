import type { SystemInfo } from '@decky/ui/dist/globals/steam-client/system';
import type { OSBranch } from '@decky/ui/dist/globals/steam-client/Updates';

export type ReportSystemInfo = {
  steamos: string;
  steamos_branch: string;
  steam: string;
  steam_branch: string;
  decky: string;
  decky_branch: string;
};

export function formatReportSystemInfo(
  system: SystemInfo,
  osBranch: OSBranch | null,
  deckyVersion: string | null,
  deckyBranch: number,
): ReportSystemInfo {
  // EOSBranch values exposed by SteamClient. Candidate channels share their parent label.
  const osBranches: Record<number, string> = {
    1: 'Stable',
    2: 'Stable',
    3: 'Beta',
    4: 'Beta',
    5: 'Preview',
    6: 'Preview',
    7: 'Main',
    8: 'Staging',
  };
  return {
    steamos: [system.sOSVersionId, system.sOSBuildId].filter(Boolean).join('_') || 'unknown',
    steamos_branch: osBranch ? osBranches[osBranch.eBranch] ?? (osBranch.sRawName || 'unknown') : 'unknown',
    steam: system.nSteamVersion ? String(system.nSteamVersion) : 'unknown',
    steam_branch: 'unknown',
    decky: deckyVersion || 'unknown',
    decky_branch: ['Stable', 'Pre-Release', 'Testing'][deckyBranch] ?? 'unknown',
  };
}

export async function getReportSystemInfo(deckyVersion: string | null, deckyBranch: number) {
  const [system, osBranch] = await Promise.all([
    SteamClient.System.GetSystemInfo(),
    SteamClient.Updates.GetCurrentOSBranch().catch(() => null),
  ]);
  return formatReportSystemInfo(system, osBranch, deckyVersion, deckyBranch);
}
