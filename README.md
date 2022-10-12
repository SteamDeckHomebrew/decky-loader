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
  <img src="https://media.discordapp.net/attachments/966017112244125756/1012466063893610506/main.jpg" alt="Decky screenshot" width="80%">
</p>

Keep an eye on the [Wiki](https://deckbrew.xyz) for more information about Decky Loader, documentation + tools for plugin development and more.

## Installation

1. Go into the Steam Deck Settings
2. Under System -> System Settings toggle `Enable Developer Mode`
3. Scroll the sidebar all the way down and click on `Developer`
4. Under Miscellaneous, enable `CEF Remote Debugging`
5. Confirm dialog and wait for system reboot
6. Click on the `STEAM` button and select `Power` -> `Switch to Desktop`
7. Make sure you have a password set with the "passwd" command in terminal to install it ([YouTube Guide](https://www.youtube.com/watch?v=1vOMYGj22rQ)).
   - It will look like the password isn't typing properly. That's normal, it's a security feature (Similar to `***` when typing passwords online)
8. Open a terminal ("Konsole" is the pre-installed terminal application) and paste the following command into it:
   - For the latest release (recommended for all users):
     - `curl -L https://github.com/SteamDeckHomebrew/decky-loader/raw/main/dist/install_release.sh | sh`
   - For the latest pre-release (testing releases, unlikely to be fully stable):
     - `curl -L https://github.com/SteamDeckHomebrew/decky-loader/raw/main/dist/install_prerelease.sh | sh`
   - For testers/plugin developers:
     - `curl -L https://github.com/SteamDeckHomebrew/decky-loader/raw/main/dist/install_prerelease.sh | sh`
     - [Wiki Link](https://deckbrew.xyz/en/loader-dev/development)
9. Done! Reboot back into Gaming mode and enjoy your plugins!

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
