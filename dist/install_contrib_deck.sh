#!/bin/sh

## Before using this script, enable sshd on the deck and setup an sshd key between the deck and your dev in sshd_config.
## This script defaults to port 22 unless otherwise specified, and cannot run without a sudo password or LAN IP.
## You will need to specify the path to the ssh key if using key connection exclusively.

printf "Installing Steam Deck Plugin Loader contributor (for Steam Deck)..."

printf "\nTHIS SCRIPT ASSUMES YOU ARE RUNNING IT ON A PC, NOT THE DECK!
If you are not planning to contribute to PluginLoader then you should not be using this script.\n
If you have a release/nightly installed this script will disable it.\n
                    You have been warned!\n"

printf "\nThis script requires you to have nodejs installed. (If nodejs doesn't bundle npm on your OS/distro, then npm is required as well).\n"

read -p "Press any key to continue"

## Verify ip address and port

USERDIR=$HOME
DEFAULTPORT=22
DECKIP=${1:-"noip"}
SSHPORT=${2:-$DEFAULTPORT}
PASSWORD=${3:-""}
SSHKEYLOC=${4:-"$HOME/.ssh/id_rsa.pub"}

# echo $DECKIP:$SSHPORT

## check that ip is provided
if [[ "$DECKIP" == "noip" ]]; then
    printf "An ip address must be provided, exiting.\n"
    exit 1
fi

## check to make sure it's not a port
if ! [[ $DECKIP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    printf "A valid ip address must be provided, exiting.\n"
    exit 1
fi

## check that the deck's password is provided
if [[ "$PASSWORD" == "" ]]; then
    printf "Deck's password not provided, exiting.\n"
    exit 1
fi

## Create folder structure (react)
CLONE_FOLDER="${USERDIR}/git"
mkdir -p ${CLONE_FOLDER} 1>/dev/null 2>&1
git clone https://github.com/SteamDeckHomebrew/PluginLoader ${CLONE_FOLDER}/pluginloader/ -b react-frontend-plugins 1>/dev/null 2>&1
git clone https://github.com/SteamDeckHomebrew/decky-frontend-lib ${CLONE_FOLDER}/pluginlibrary/ 1>/dev/null 2>&1
git clone https://github.com/SteamDeckHomebrew/decky-plugin-template ${CLONE_FOLDER}/plugintemplate/ 1>/dev/null 2>&1

## ssh into deck and disable PluginLoader release/nightly service
ssh deck@$DECKIP -p $SSHPORT -i $SSHKEYLOC "echo ${PASSWORD} | sudo -S systemctl disable --now plugin_loader 1>/dev/null 2>&1" 1>/dev/null 2>&1

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

printf "Copying relevant files to install directory\n"

rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} -i ${SSHKEYLOC}" --exclude='.git/' --exclude='node_modules' --exclude='README.md' --exclude="package-lock.json" --exclude='LICENSE' --exclude=='frontend' --delete ${CLONE_FOLDER}/pluginloader/* deck@${DECKIP}:/home/deck/dev/pluginloader/

rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} -i ${SSHKEYLOC}" --exclude='.git/' --exclude='node_modules' --exclude="package-lock.json" --exclude='README.md' --exclude='LICENSE' --delete ${CLONE_FOLDER}/plugintemplate/* deck@${DECKIP}:/home/deck/dev/plugins/plugintemplate