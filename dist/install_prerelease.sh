#!/bin/sh

[ "$UID" -eq 0 ] || exec sudo "$0" "$@"

echo "Installing Steam Deck Plugin Loader release..."

HOMEBREW_FOLDER=/home/deck/homebrew

# # Create folder structure
rm -rf ${HOMEBREW_FOLDER}/services
sudo -u deck mkdir -p ${HOMEBREW_FOLDER}/services
sudo -u deck mkdir -p ${HOMEBREW_FOLDER}/plugins

# Download latest release and install it
DOWNLOADURL="$(curl -s 'https://api.github.com/repos/SteamDeckHomebrew/PluginLoader/releases' | jq -r "first(.[] | select(.prerelease == "true"))" | jq -r ".assets[].browser_download_url")"
# printf "DOWNLOADURL=$DOWNLOADURL\n"
curl -L $DOWNLOADURL --output ${HOMEBREW_FOLDER}/services/PluginLoader
chmod +x ${HOMEBREW_FOLDER}/services/PluginLoader

systemctl --user stop plugin_loader 2> /dev/null
systemctl --user disable plugin_loader 2> /dev/null

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
Enviornment=LOG_LEVEL=DEBUG
[Install]
WantedBy=multi-user.target
EOM
systemctl daemon-reload
systemctl start plugin_loader
systemctl enable plugin_loader
