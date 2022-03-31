# SteamOS Plugin Manager

![steamuserimages-a akamaihd](https://user-images.githubusercontent.com/10835354/161068262-ca723dc5-6795-417a-80f6-d8c1f9d03e93.jpg)

## Installation
- Go into the Steam Deck Settings
- Under System -> System Settings toggle `Enable Developer Mode`
- Scroll the sidebar all the way down and click on `Developer`
- Under Miscellaneous, enable `CEF Remote Debugging`
- Place the executable under `~/homebrew/services/plugin_manager`. Do not change the name of the file.
- Place the plugin_manager.service file under `/etc/systemd/system`
- Open a Terminal and type `sudo systemctl --now enable plugin_manager`

### Install Plugins
- Simply copy the plugin's .js file into `~/homebrew/services/plugin_manager/plugins`

## Features
- Clean injecting and loading of one or more plugins
- Persistent. It doesn't need to be reinstalled after every system update 

## Credit

The original idea for the concept is based on the work of [marios8543's steamdeck-ui-inject](https://github.com/marios8543/steamdeck-ui-inject) project.
