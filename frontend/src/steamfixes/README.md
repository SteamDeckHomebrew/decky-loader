## What's this?

`steamfixes` contains various fixes and workaround for things Valve has broken that cause Decky issues.

## Current fixes:

- StartRestart() -> StartShutdown(false) override:

  StartRestart() breaks CEF debugging, StartShutdown(false) doesn't. We can safely replace StartRestart() with StartShutdown(false) as gamescope-session will automatically restart the steam client anyway if it shuts down, bypassing the broken restart codepath. Added 12/29/2022

- ExecuteSteamURL UI reload fix:

  Starting sometime in November 2022, Valve broke reloading the Steam UI pages via location.reload, as it won't properly start the UI. We can manually trigger UI startup if we detect no active input contexts by calling `SteamClient.URL.ExecuteSteamURL("steam://open/settings/")` Added 12/29/2022
