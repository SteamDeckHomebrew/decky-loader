#!/bin/sh

if [ "$(whoami)" != "root" ]; then
    su -c "$0 $*"
    exit
fi

echo "Installing Steam Deck Plugin Loader release..."

HOMEBREW_FOLDER=/home/deck/homebrew

# Create folder structure
rm -rf ${HOMEBREW_FOLDER}/services
mkdir -p ${HOMEBREW_FOLDER}/services
mkdir -p ${HOMEBREW_FOLDER}/plugins

# Download latest release and install it
curl -L https://github.com/SteamDeckHomebrew/PluginLoader/releases/latest/download/PluginLoader --output ${HOMEBREW_FOLDER}/services/PluginLoader
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