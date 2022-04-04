# Plugin Loader

![steamuserimages-a akamaihd](https://user-images.githubusercontent.com/10835354/161068262-ca723dc5-6795-417a-80f6-d8c1f9d03e93.jpg)

## Installation

While in Gaming Mode
1. Go into the Steam Deck Settings
2. Under System -> System Settings toggle `Enable Developer Mode`
3. Scroll the sidebar all the way down and click on `Developer`
4. Under Miscellaneous, enable `CEF Remote Debugging`


While in Desktop Mode (Steam button -> Power -> Switch to Desktop)
1. Download the .zip file from GitHub, extract it to your Downloads folder.
2. Inside the extracted folder, locate "install.sh" and mark it as executable.
    1. Either by right click -> Properties -> Permissions -> Tick the "Is executable" box
    2. Or, chmod +x install.sh
3. Open terminal (Konsole), "cd" into the extracted "PluginLoader-main" folder `cd Downloads/PluginLoader-main/`
4. Run `sudo install.sh` in Konsole.

### Install Plugins
- Simply copy the plugin's .py file into `~/homebrew/plugins`

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
