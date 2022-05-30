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

## Verify ip address and port

USERDIR=$HOME
DEFAULTPORT=22
DECKIP=${1:-"noip"}
SSHPORT=${2:-$DEFAULTPORT}
SSHKEYLOC=${3:-"$HOME/.ssh/id_rsa.pub"}
PASSWORD=${4:-""}

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

## TODO: once react PR is merged and libraries are publicly avaliable, enable this block to add frontend-lib and plugin template

## Create folder structure (react)
## TODO: CHANGE TO HTTPS AFTER REPOS GO PUBLIC
CLONE_FOLDER="${USERDIR}/git"
mkdir -p ${CLONE_FOLDER} 2>/dev/null
git clone https://github.com/SteamDeckHomebrew/PluginLoader ${CLONE_FOLDER}/pluginloader/ -b react-frontend-plugins 2>/dev/null
git clone git@github.com:SteamDeckHomebrew/decky-frontend-lib ${CLONE_FOLDER}/pluginlibrary/ 2>/dev/null
git clone git@github.com:SteamDeckHomebrew/decky-plugin-template ${CLONE_FOLDER}/plugintemplate/ 2>/dev/null

## ssh into deck and disable PluginLoader release/nightly service
ssh deck@$DECKIP -p $SSHPORT -i $SSHKEYLOC "echo ${PASSWORD} | sudo -S systemctl disable --now plugin_loader 2>/dev/null" 2>/dev/null

## Transpile and bundle typescript

type npm 2> /dev/null

NPMLIVES=$?

if ! [[ "$NPMLIVES" -eq 0 ]]; then
    printf "npm does not to be installed, exiting.\n"
    exit 1
fi

printf "Input password to install typscript compilier.\n"

sudo npm i -g tsc

cd ${CLONE_FOLDER}/pluginlibrary/
npm install
npm run build
sudo npm link

cd ${CLONE_FOLDER}/pluginloader/frontend
npm install
npm link decky-frontend-lib
npm run build

cd ${CLONE_FOLDER}/plugintemplate
npm install
npm link decky-frontend-lib
npm run build

# Transfer relevant files to deck

rsync -avzp --mkpath --rsh="ssh -p 55828 -i ${SSHKEYLOC}" --exclude='.git/' --exclude='node_modules' --exclude='README.md' --exclude='LICENSE' --exclude=='frontend' --delete ${CLONE_FOLDER}/pluginloader/* deck@${DECKIP}:/home/deck/dev/pluginloader/

rsync -avzp --mkpath --rsh="ssh -p 55828 -i ${SSHKEYLOC}" --exclude='.git/' --exclude='node_modules' --exclude='README.md' --exclude='LICENSE' --delete ${CLONE_FOLDER}/plugintemplate/* deck@${DECKIP}:/home/deck/dev/plugins/plugintemplate

## Create folder structure (old version, left as legacy support)
# CLONE_FOLDER="${USERDIR}/tmpgit"
# mkdir -p ${CLONE_FOLDER} 2>/dev/null
# git clone https://github.com/SteamDeckHomebrew/PluginLoader ${CLONE_FOLDER}/pluginloader 2>/dev/null
# git clone https://github.com/SteamDeckHomebrew/Plugin-Template ${CLONE_FOLDER}/plugintemplate 2>/dev/null

# ## Transfer relevant files to deck

# rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} -i ${SSHKEYLOC}" --exclude='.git/' --exclude='README.md' --exclude='LICENSE' --exclude=='frontend' ${CLONE_FOLDER}/pluginloader/* deck@${DECKIP}:/home/deck/tmp/pluginloader/

# rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} -i ${SSHKEYLOC}" --exclude='.git/' --exclude='README.md' --exclude='LICENSE' --exclude=='frontend' ${CLONE_FOLDER}/plugintemplate/* deck@${DECKIP}:/home/deck/tmp/plugins/plugintemplate
