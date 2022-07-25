#!/bin/sh

[ "$UID" -eq 0 ] || exec sudo "$0" "$@"

echo "Uninstalling Steam Deck Plugin Loader..."

USERDIR="$(getent passwd $SUDO_USER | cut -d: -f6)"
HOMEBREW_FOLDER="${USERDIR}/homebrew"

# Disable and remove services
sudo systemctl disable --now plugin_loader.service > /dev/null
sudo rm -f "${USERDIR}/.config/systemd/user/plugin_loader.service"
sudo rm -f "/etc/systemd/system/plugin_loader.service"

# Remove temporary folder if it exists from the install process
rm -rf "/tmp/plugin_loader"

# Cleanup services folder
sudo rm "${HOMEBREW_FOLDER}/services/PluginLoader"

