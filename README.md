# Plugin Loader [![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg)](https://discord.gg/ZU74G2NJzk)

![steamuserimages-a akamaihd](https://user-images.githubusercontent.com/10835354/161068262-ca723dc5-6795-417a-80f6-d8c1f9d03e93.jpg)

## Installation
1. Go into the Steam Deck Settings
2. Under System -> System Settings toggle `Enable Developer Mode`
3. Scroll the sidebar all the way down and click on `Developer`
4. Under Miscellaneous, enable `CEF Remote Debugging`
5. Click on the `STEAM` button and select `Power` -> `Switch to Desktop`
6. Open a terminal and paste the following command into it: `curl https://werwolv.net/dist/steamdeck/plugin_loader_release.php | sh`
7. Done! Reboot back into Gaming mode and enjoy your plugins!

### Install Plugins
- Simply copy the plugin's folder into `~/homebrew/plugins`

### Developing plugins
- There is no complete plugin development documentation yet. However a good starting point is the [Plugin Template](https://github.com/SteamDeckHomebrew/Plugin-Template) repository

## Features
- Clean injecting and loading of one or more plugins
- Persistent. It doesn't need to be reinstalled after every system update 
- Allows 2-way communication between the plugins and the loader.
- Allows plugins to define python functions and run them from javascript.
- Allows plugins to make fetch calls, bypassing cors completely.

## Caveats

- You can only interact with the Plugin Menu via touchscreen.

## Credit

The original idea for the concept is based on the work of [marios8543's steamdeck-ui-inject](https://github.com/marios8543/steamdeck-ui-inject) project.
