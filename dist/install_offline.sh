#!/bin/sh

set -e

[ "$UID" -eq 0 ] || exec sudo "$0" "$@"

BINARY_PATH="$1"

if [ -z "$BINARY_PATH" ] || [ ! -f "$BINARY_PATH" ]; then
    echo "Usage: sudo $0 /path/to/PluginLoader"
    echo ""
    echo "Download the PluginLoader binary from:"
    echo "  https://github.com/SteamDeckHomebrew/decky-loader/releases"
    echo "Then run this script with the path to the downloaded binary."
    exit 1
fi

echo "Installing Decky Loader (offline)..."

# Detect user home directory
if [ -n "$SUDO_USER" ]; then
    USER_DIR="$(getent passwd "$SUDO_USER" | cut -d: -f6)"
else
    echo "Error: Could not detect user. Run with sudo (not as root directly)."
    exit 1
fi

HOMEBREW_FOLDER="${USER_DIR}/homebrew"

# Stop existing service if running
systemctl stop plugin_loader.service 2>/dev/null || true

# Create directory structure
mkdir -p "${HOMEBREW_FOLDER}/services/.systemd"
mkdir -p "${HOMEBREW_FOLDER}/plugins"
mkdir -p "${HOMEBREW_FOLDER}/settings"

# Install binary
cp "$BINARY_PATH" "${HOMEBREW_FOLDER}/services/PluginLoader"
chmod 755 "${HOMEBREW_FOLDER}/services/PluginLoader"

# Handle SELinux
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" = "Enforcing" ]; then
    chcon -t bin_t "${HOMEBREW_FOLDER}/services/PluginLoader"
fi

# Install systemd service
cat > /etc/systemd/system/plugin_loader.service <<EOF
[Unit]
Description=SteamDeck Plugin Loader
After=network.target
[Service]
Type=simple
User=root
Restart=always
KillMode=process
TimeoutStopSec=15
ExecStart=${HOMEBREW_FOLDER}/services/PluginLoader
WorkingDirectory=${HOMEBREW_FOLDER}/services
Environment=UNPRIVILEGED_PATH=${HOMEBREW_FOLDER}
Environment=PRIVILEGED_PATH=${HOMEBREW_FOLDER}
Environment=LOG_LEVEL=INFO
[Install]
WantedBy=multi-user.target
EOF

# Backup service file
cp /etc/systemd/system/plugin_loader.service "${HOMEBREW_FOLDER}/services/.systemd/plugin_loader.service"

# Set ownership (service runs as root but dirs should be user-owned)
chown -R "$SUDO_USER":"$SUDO_USER" "${HOMEBREW_FOLDER}"

# Enable and start
systemctl daemon-reload
systemctl enable --now plugin_loader.service

echo ""
echo "Decky Loader installed successfully!"
echo "  Install path: ${HOMEBREW_FOLDER}"
echo "  Service: plugin_loader.service (running)"
echo ""
echo "Return to Gaming Mode to use Decky."
