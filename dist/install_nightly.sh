#!/bin/sh

[ "$UID" -eq 0 ] || exec sudo "$0" "$@"

echo "Installing Steam Deck Plugin Loader nightly..."

HOMEBREW_FOLDER=/home/deck/homebrew

# Create folder structure
rm -rf ${HOMEBREW_FOLDER}/services
mkdir -p ${HOMEBREW_FOLDER}/services
mkdir -p ${HOMEBREW_FOLDER}/plugins

# Download latest nightly build and install it
rm -rf /tmp/plugin_loader
mkdir -p /tmp/plugin_loader
curl -L https://nightly.link/SteamDeckHomebrew/PluginLoader/workflows/build/main/Plugin%20Loader.zip --output /tmp/plugin_loader/PluginLoader.zip
unzip /tmp/plugin_loader/PluginLoader.zip -d /tmp/plugin_loader
cp /tmp/plugin_loader/PluginLoader ${HOMEBREW_FOLDER}/services/PluginLoader
rm -rf /tmp/plugin_loader
chmod +x ${HOMEBREW_FOLDER}/services/PluginLoader

systemctl stop plugin_loader 2> /dev/null
systemctl disable plugin_loader 2> /dev/null
rm -f /etc/systemd/system/plugin_loader.service
cat > /etc/systemd/system/plugin_loader.service <<- EOM
[Unit]
Description=SteamDeck Plugin Loader

[Service]
Type=simple
User=root
Restart=always

ExecStart=/home/deck/homebrew/services/PluginLoader
WorkingDirectory=/home/deck/homebrew/services

Environment=PLUGIN_PATH=/home/deck/homebrew/plugins

[Install]
WantedBy=multi-user.target
EOM
systemctl daemon-reload
systemctl start plugin_loader
systemctl enable plugin_loader
