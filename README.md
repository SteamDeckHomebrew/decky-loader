<h1 align="center">
  <a name="logo" href="https://deckbrew.xyz/"><img src="https://deckbrew.xyz/logo.png" alt="Deckbrew logo" width="200"></a>
  <br>
  Decky Loader
</h1>

<p align="center">
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/releases"><img src="https://img.shields.io/github/downloads/SteamDeckHomebrew/decky-loader/total" /></a>
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/stargazers"><img src="https://img.shields.io/github/stars/SteamDeckHomebrew/decky-loader" /></a>
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/commits/main"><img src="https://img.shields.io/github/last-commit/SteamDeckHomebrew/decky-loader.svg" /></a>
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/blob/main/LICENSE"><img src="https://img.shields.io/github/license/SteamDeckHomebrew/decky-loader" /></a>
  <a href="https://discord.gg/ZU74G2NJzk"><img src="https://img.shields.io/discord/960281551428522045?color=%235865F2&label=discord" /></a>
  <br>
  <br>
  <img src="https://media.discordapp.net/attachments/966017112244125756/1012466063893610506/main.jpg" alt="Decky screenshot" width="80%">
</p>

## 📖 About

Decky Loader is a homebrew plugin launcher for the Steam Deck. It can be used to [stylize your menus](https://github.com/suchmememanyskill/SDH-CssLoader), [change system sounds](https://github.com/EMERALD0874/SDH-AudioLoader), [adjust your screen saturation](https://github.com/libvibrant/vibrantDeck), [change additional system settings](https://github.com/NGnius/PowerTools), and [more](https://beta.deckbrew.xyz/).

For more information about Decky Loader as well as documentation and development tools, please visit [our wiki](https://deckbrew.xyz).

## 💾 Installation

1. Press the <img src="./docs/images/steam.svg" height=16> button and open the Settings menu.
1. Navigate to the System menu and scroll to the System Settings. Toggle "Enable Developer Mode" so it is enabled.
1. Navigate to the Developer menu and scroll to Miscellaneous. Toggle "CEF Remote Debugging" so it is enabled.
1. Select "Restart Now" to apply your changes.
1. Press the <img src="./docs/images/steam.svg" height=16> button and open the Power menu.
1. Select "Switch to Desktop". A keyboard and mouse or using the [Steam Link app](https://steamcommunity.com/app/353380/discussions/8/3105764348181505385/) is recommended for the following steps.
1. Open the Konsole app and set a password using the command `passwd`. ([YouTube Guide](https://www.youtube.com/watch?v=1vOMYGj22rQ))
   - It will look like the password isn't typing properly. That is normal, it's a security feature similar to seeing "\*\*\*" when typing passwords online.
1. Choose the version of Decky Loader you want to install and paste the following command into the Konsole app.
   - **Latest Release**  
     Intended for most users. This is the latest stable version of Decky Loader.  
     `curl -L https://github.com/SteamDeckHomebrew/decky-loader/raw/main/dist/install_release.sh | sh`
   - **Latest Pre-Release**  
     Intended for plugin developers. Pre-releases are unlikely to be fully stable but contain the latest changes. For more information on plugin development, please consult [the wiki page](https://deckbrew.xyz/en/loader-dev/development).  
     `curl -L https://github.com/SteamDeckHomebrew/decky-loader/raw/main/dist/install_prerelease.sh | sh`
1. Open the Return to Gaming Mode shortcut on your desktop.

### Install/Uninstall Plugins

- Using the shopping bag button in the top right corner of the plugin menu, you can go to the offical Plugin Store ([Web Preview](https://beta.deckbrew.xyz/)).
- Install from URL in the settings menu.
- Use the settings menu to uninstall plugins, this will not remove any files made in different directories by plugins.

### Uninstall

- Open a terminal and paste the following command into it:
  - `curl -L https://github.com/SteamDeckHomebrew/decky-loader/raw/main/dist/uninstall.sh | sh`

## Features

- Clean injecting and loading of one or more plugins
- Persistent. It doesn't need to be reinstalled after every system update
- Allows 2-way communication between the plugins and the loader.
- Allows plugins to define python functions and run them from javascript.
- Allows plugins to make fetch calls, bypassing cors completely.

## Developing plugins

- There is no complete plugin development documentation yet. However a good starting point is the [Plugin Template](https://github.com/SteamDeckHomebrew/decky-plugin-template) repository.

## [Contribution](https://deckbrew.xyz/en/loader-dev/development)

- Please consult the [Wiki](https://deckbrew.xyz/en/loader-dev/development) for installing development versions of Decky Loader.
  - This is also useful for Plugin Developers looking to target new but unreleased versions of Decky Loader.
- [Here's how to get the Steam Deck UI on your enviroment of choice.](https://youtu.be/1IAbZte8e7E?t=112)
  - (The video shows Windows usage but unless you're using Arch WSL/cygwin this script is unsupported on Windows.)

### Getting Started

1. Clone the repository using the latest commit to main before starting your PR.
2. In your clone of the repository run these commands:
   1. `pnpm i`
   2. `pnpm run build`
3. If you are modifying the UI, these will need to be run before deploying the changes to your Deck.
4. Use the vscode tasks or `deck.sh` script to deploy your changes to your Deck to test them.
5. You will be testing your changes with the python script version, so you will need to build, deploy and reload each time.

Note: If you are recieveing build errors due to an out of date library, you should run this command inside of your repository:

```bash
pnpm update decky-frontend-lib --latest
```

Source control and deploying plugins are left to each respective contributor for the cloned repos in order to keep depedencies up to date.

## Credit

The original idea for the concept is based on the work of [marios8543's steamdeck-ui-inject](https://github.com/marios8543/steamdeck-ui-inject) project.
