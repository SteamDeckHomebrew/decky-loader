#!/bin/sh

## Before using this script, enable sshd on the deck and setup an sshd key between the deck and your dev in sshd_config.
## This script defaults to port 22 unless otherwise specified, and cannot run without a sudo password or LAN IP.
## You will need to specify the path to the ssh key if using key connection exclusively.

printf "Installing Steam Deck Plugin Loader contributor..."

printf "\nTHIS SCRIPT ASSUMES YOU ARE RUNNING IT ON A PC, NOT THE DECK!
If you are not planning to contribute to PluginLoader then you should not be using this script.\n
If you have a release/nightly installed this script will disable it.\n
                    You have been warned!\n"

printf "\nThis script requires you to have nodejs installed. (If nodejs doesn't bundle npm on your OS/distro, then npm is required as well).\n"

read -p "Press any key to continue"

USERDIR=$HOME
INSTALLDIR=$HOME/$1

## Create folder structure (react)
CLONE_FOLDER="${USERDIR}/git"
mkdir -p ${CLONE_FOLDER} 1>/dev/null 2>&1
git clone https://github.com/SteamDeckHomebrew/PluginLoader ${CLONE_FOLDER}/pluginloader -b react-frontend-plugins 1>/dev/null 2>&1
git clone https://github.com/SteamDeckHomebrew/decky-frontend-lib ${CLONE_FOLDER}/pluginlibrary 1>/dev/null 2>&1
git clone https://github.com/SteamDeckHomebrew/decky-plugin-template ${CLONE_FOLDER}/plugintemplate 1>/dev/null 2>&1

## Transpile and bundle typescript

type npm &> '/dev/null'

NPMLIVES=$?

if ! [[ "$NPMLIVES" -eq 0 ]]; then
    printf "npm does not to be installed, exiting.\n"
    exit 1
fi

[ "$UID" -eq 0 ] || printf "Input password to install typscript compilier.\n"

sudo npm install --quiet -g tsc &> '/dev/null'

printf "Transpiling and bundling typescript.\n"

cd ${CLONE_FOLDER}/pluginlibrary/
npm install --quiet &> '/dev/null'
npm run build --quiet &> '/dev/null'
sudo npm link --quiet &> '/dev/null'

cd ${CLONE_FOLDER}/pluginloader/frontend
npm install --quiet &> '/dev/null'
npm link decky-frontend-lib --quiet &> '/dev/null'
npm run build --quiet &> '/dev/null'

cd ${CLONE_FOLDER}/plugintemplate
npm install --quiet &> '/dev/null'
npm link decky-frontend-lib --quiet &> '/dev/null'
npm  run build --quiet &> '/dev/null'

## Transfer relevant files to deck

mkdir -p ${INSTALLDIR}/pluginloader
mkdir -p ${INSTALLDIR}/plugins/plugintemplate

rsync -avxr --exclude="*.git*" ${CLONE_FOLDER}/pluginloader ${INSTALLDIR} &> '/dev/null'
rsync -avxr --exclude="*.git*" ${CLONE_FOLDER}/plugintemplate ${INSTALLDIR}/plugins &> '/dev/null'