#!/bin/sh

[ "$UID" -eq 0 ] || exec sudo "$0" "$@"

echo "Installing Steam Deck Plugin Loader release..."

USERDIR="$(getent passwd $SUDO_USER | cut -d: -f6)"
HOMEBREW_FOLDER="${USERDIR}/homebrew"

# Create folder structure
rm -rf "${HOMEBREW_FOLDER}/services"
sudo -u $SUDO_USER mkdir -p "${HOMEBREW_FOLDER}/services"
sudo -u $SUDO_USER mkdir -p "${HOMEBREW_FOLDER}/plugins"

# Download latest release and install it
curl -L https://github.com/SteamDeckHomebrew/PluginLoader/releases/latest/download/PluginLoader --output "${HOMEBREW_FOLDER}/services/PluginLoader"
chmod +x "${HOMEBREW_FOLDER}/services/PluginLoader"

systemctl --user stop plugin_loader 2> /dev/null
systemctl --user disable plugin_loader 2> /dev/null

systemctl stop plugin_loader 2> /dev/null
systemctl disable plugin_loader 2> /dev/null
rm -f "/etc/systemd/system/plugin_loader.service"
cat > "/etc/systemd/system/plugin_loader.service" <<- EOM
[Unit]
Description=SteamDeck Plugin Loader
[Service]
Type=simple
User=root
Restart=always
ExecStart=${USERDIR}/homebrew/services/PluginLoader
WorkingDirectory=${USERDIR}/homebrew/services
Environment=PLUGIN_PATH=${USERDIR}/homebrew/plugins
[Install]
WantedBy=multi-user.target
EOM
systemctl daemon-reload
systemctl start plugin_loader
systemctl enable plugin_loader
