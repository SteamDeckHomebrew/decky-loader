#!/bin/sh

echo "Installing Steam Deck Plugin Loader release..."

HOMEBREW_FOLDER=/home/deck/homebrew

# Create folder structure
rm -rf ${HOMEBREW_FOLDER}/services
mkdir -p ${HOMEBREW_FOLDER}/services
mkdir -p ${HOMEBREW_FOLDER}/plugins

# Download latest release and install it
curl -L https://github.com/SteamDeckHomebrew/PluginLoader/releases/latest/download/PluginLoader --output ${HOMEBREW_FOLDER}/services/PluginLoader
chmod +x ${HOMEBREW_FOLDER}/services/PluginLoader

systemctl --user stop plugin_loader 2> /dev/null
systemctl --user disable plugin_loader 2> /dev/null
rm -f /home/deck/.config/systemd/user/plugin_loader.service
cat > /home/deck/.config/systemd/user/plugin_loader.service <<- EOM
[Unit]
Description=SteamDeck Plugin Loader

[Service]
Type=simple

ExecStart=/home/deck/homebrew/services/PluginLoader
WorkingDirectory=/home/deck/homebrew/services

Environment=PLUGIN_PATH=/home/deck/homebrew/plugins

[Install]
WantedBy=default.target
EOM
systemctl --user daemon-reload
systemctl --user start plugin_loader
systemctl --user enable plugin_loader