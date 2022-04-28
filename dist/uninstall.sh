#!/bin/sh

echo "Uninstalling Steam Deck Plugin Loader and all plugins..."

HOMEBREW_FOLDER=/home/deck/homebrew

# Disable and remove services
sudo systemctl disable --now plugin_loader.service > /dev/null
sudo rm -f /home/deck/.config/systemd/user/plugin_loader.service
sudo rm -f /etc/systemd/system/plugin_loader.service

# Remove temporary folder if it exists from the install process
rm -rf /tmp/plugin_loader

# Remove folder structure
sudo rm -rf ${HOMEBREW_FOLDER}

