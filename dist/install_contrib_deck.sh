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

## User chooses preffered clone & install directories

printf "Enter the directory in /home/user to clone to.\n"
printf "Example: if your home directory is /home/user you would type: git\n"
printf "The clone directory would be: ${HOME}/git\n"
read -p "Enter your clone directory: " CLONEFOLDER

if ! [[ "$CLONEFOLDER" =~ ^[[:alnum:]]+$ ]]; then
    printf "\nFolder name not provided. Using default, 'git'.\n"
    CLONEFOLDER="git"
fi

printf "Enter the directory in /home/deck to install to.\n"
printf "Example: Since the Deck's home directory is /home/deck you would type: loaderdev\n"
printf "The install directory would be: /home/deck/loaderdev\n"
read -p "Enter your install directory: " INSTALLFOLDER

if ! [[ "$INSTALLFOLDER" =~ ^[[:alnum:]]+$ ]]; then
    printf "Folder name not provided. Using default, 'loaderdev'.\n"
    INSTALLFOLDER="loaderdev"
fi

CLONEDIR="$HOME/$CLONEFOLDER"
INSTALLDIR="/home/deck/$INSTALLFOLDER"

# echo "CLONEDIR=$CLONEDIR"
# echo "INSTALLDIR=$INSTALLDIR"

## Input ip address, port, password and sshkey

### get ip address of deck from user
read -p "Enter the ip address of your Steam Deck: " DECKIP

### check that ip is provided
if [[ "$DECKIP" == "" ]]; then
    printf "An ip address must be provided, exiting.\n"
    exit 1
fi

### check to make sure it's a potentially valid ipv4 address
if ! [[ $DECKIP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    printf "A valid ip address must be provided, exiting.\n"
    exit 1
fi

### get ssh port from user
read -p "Enter the ssh port of your Steam Deck: " SSHPORT

### check to make sure a port was specified
if [[ "$SSHPORT" == "" ]]; then
    printf "ssh port not provided. Using default, '22'.\n"
    SSHPORT="22"
fi

### check for valid ssh port
if [[ $SSHPORT -le 0 ]]; then
    printf "A valid ssh port must be provided, exiting.\n"
    exit 1
fi

### prompt the user for their deck's password
printf "Enter the password for the Steam Deck user 'deck' : "
read -s PASSWORD
printf "\n"

### check to make sure a password was specified
if [[ "$PASSWORD" == "" ]]; then
    printf "Password was not provided, exiting.\n"
    # PASSWORD="steam"
    exit 1
fi

### prompt the user for their ssh key
read -p "Enter the directory for your ssh key, for ease of connection : " SSHKEYLOC

### check if ssh key is present at location provided
if [[ "$SSHKEYLOC" == "" ]]; then
    # SSHKEYLOC="$HOME/.ssh/id_rsa"
    printf "ssh key was not provided. Defaulting to $SSHKEYLOC if it exists.\n"
fi

### check if sshkey is present at location
if ! [[ -e "$SSHKEYLOC" ]]; then
    printf "ssh key does not exist. This script will use password authentication.\n"
fi

## Create folder structure

printf "\nCloning git repositories.\n"

mkdir -p ${CLONEDIR} &> '/dev/null'

git clone https://github.com/SteamDeckHomebrew/PluginLoader ${CLONEDIR}/pluginloader -b react-frontend-plugins &> '/dev/null'
CODE=$?
if [[ $CODE -eq 128 ]]; then
    cd ${CLONEDIR}/pluginloader
    git fetch &> '/dev/null'
fi

git clone https://github.com/SteamDeckHomebrew/decky-frontend-lib ${CLONEDIR}/pluginlibrary &> '/dev/null'
CODE=$?
if [[ $CODE -eq 128 ]]; then
    cd ${CLONEDIR}/pluginlibrary
    git fetch &> '/dev/null'
fi

git clone https://github.com/SteamDeckHomebrew/decky-plugin-template ${CLONEDIR}/plugintemplate &> '/dev/null'
CODE=$?
if [[ $CODE -eq 128 ]]; then
    cd ${CLONEDIR}/plugintemplate
    git fetch &> '/dev/null'
fi

### ssh into deck and disable PluginLoader release/nightly service
printf "Connecting via ssh to disable any PluginLoader release versions.\n"

if [[ "$SSHKEYLOC" == "" ]]; then
    ssh deck@$DECKIP -p $SSHPORT "echo ${PASSWORD} | sudo -S systemctl disable --now plugin_loader"
else
    ssh deck@$DECKIP -p $SSHPORT -i $SSHKEYLOC "echo ${PASSWORD} | sudo -S systemctl disable --now plugin_loader" &> '/dev/null'
fi

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

cd ${CLONEDIR}/pluginlibrary/
npm install --quiet &> '/dev/null'
npm run build --quiet &> '/dev/null'
sudo npm link --quiet &> '/dev/null'

cd ${CLONEDIR}/pluginloader/frontend
npm install --quiet &> '/dev/null'
npm link decky-frontend-lib --quiet &> '/dev/null'
npm run build --quiet &> '/dev/null'

cd ${CLONEDIR}/plugintemplate
npm install --quiet &> '/dev/null'
npm link decky-frontend-lib --quiet &> '/dev/null'
npm  run build --quiet &> '/dev/null'

## Transfer relevant files to deck

printf "Copying relevant files to install directory\n"

if [[ "$SSHKEYLOC" == "" ]]; then
    ### copy files for PluginLoader (without ssh key)
    rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT}" --exclude='.git/' --exclude='node_modules' --exclude='README.md' --exclude="package-lock.json" --exclude='LICENSE' --exclude=='frontend' --exclude="*dist*" --exclude="*.pyc" --delete ${CLONEDIR}/pluginloader/* deck@${DECKIP}:${INSTALLDIR}/pluginloader/ &> '/dev/null'
    ### copy files for PluginLoader template (without ssh key)
    rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT}" --exclude='.git/' --exclude='node_modules' --exclude="package-lock.json" --exclude='README.md' --exclude='LICENSE' --delete ${CLONEDIR}/plugintemplate deck@${DECKIP}:${INSTALLDIR}/plugins/plugintemplate &> '/dev/null'
else
    ### copy files for PluginLoader (with ssh key)
    rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} -i ${SSHKEYLOC}" --exclude='.git/' --exclude='node_modules' --exclude='README.md' --exclude="package-lock.json" --exclude='LICENSE' --exclude=='frontend' --exclude="*dist*" --exclude="*.pyc" --delete ${CLONEDIR}/pluginloader/* deck@${DECKIP}:${INSTALLDIR}/pluginloader/ &> '/dev/null'
    ### copy files for PluginLoader template (with ssh key)
    rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} -i ${SSHKEYLOC}" --exclude='.git/' --exclude='node_modules' --exclude="package-lock.json" --exclude='README.md' --exclude='LICENSE' --delete ${CLONEDIR}/plugintemplate deck@${DECKIP}:${INSTALLDIR}/plugins/plugintemplate &> '/dev/null'
fi

printf "All done!\n"