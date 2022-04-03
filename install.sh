#!/bin/sh

if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root"
    exit
fi

HOMEBREW_FOLDER=/home/deck/homebrew
LOADER_FOLDER=$(realpath $(dirname "$0"))

# Create folder structure
rm -rf ${HOMEBREW_FOLDER}/services/plugin_loader
mkdir -p ${HOMEBREW_FOLDER}/services/plugin_loader
mkdir -p ${HOMEBREW_FOLDER}/plugins
chown -R deck ${HOMEBREW_FOLDER}

# Install our files
cp -a ${LOADER_FOLDER}/plugin_loader/. /home/deck/homebrew/services/plugin_loader/

# Install pip if it's not installed yet
python -m pip &> /dev/null
if [ $? -ne 0 ]; then
    curl https://bootstrap.pypa.io/get-pip.py --output /tmp/get-pip.py
    python /tmp/get-pip.py
fi

# Install dependencies
python -m pip install -r requirements.txt

# Create a service
systemctl stop plugin_loader

cp ./plugin_loader.service /etc/systemd/system/plugin_loader.service

systemctl daemon-reload
systemctl enable plugin_loader
systemctl start plugin_loader