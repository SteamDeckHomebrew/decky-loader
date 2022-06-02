#!/bin/sh

## Before using this script, enable sshd on the deck and setup an sshd key between the deck and your dev in sshd_config.
## This script defaults to port 22 unless otherwise specified, and cannot run without a sudo password or LAN IP.
## You will need to specify the path to the ssh key if using key connection exclusively.

## Pre-parse arugments for ease of use
CLONEFOLDER=${1:-""}
INSTALLFOLDER=${2:-""}
DECKIP=${3:-""}
SSHPORT=${4:-""}
PASSWORD=${5:-""}
SSHKEYLOC=${6:-""}

## gather options into an array 
OPTIONSARRAY=("$CLONEFOLDER" $INSTALLFOLDER "$DECKIP" "$SSHPORT" "$PASSWORD" "$SSHKEYLOC")

## iterate through options array to check their presence
count=0
for OPTION in ${OPTIONSARRAY[@]}; do
    ! [[ "$OPTION" == "" ]] && count=$(($count+1))
    # printf "OPTION=$OPTION\n"
done

setfolder() {
    if [[ "$2" == "clone" ]]; then
        local ACTION="clone"
        local DEFAULT="git"
    elif [[ "$2" == "install" ]]; then
        local ACTION="install"
        local DEFAULT="loaderdev"
    fi

    printf "Enter the directory in /home/user to ${ACTION} to.\n"
    printf "Example: if your home directory is /home/user you would type: ${DEFAULT}\n"
    printf "The ${ACTION} directory would be: ${HOME}/${DEFAULT}\n"
    if [[ "$ACTION" == "clone" ]]; then
        read -p "Enter your ${ACTION} directory: " CLONEFOLDER
        if ! [[ "$CLONEFOLDER" =~ ^[[:alnum:]]+$ ]]; then
            printf "Folder name not provided. Using default, '${DEFAULT}'.\n"
            CLONEFOLDER="${DEFAULT}"
        fi
    elif [[ "$ACTION" == "install" ]]; then
        read -p "Enter your ${ACTION} directory: " INSTALLFOLDER
        if ! [[ "$INSTALLFOLDER" =~ ^[[:alnum:]]+$ ]]; then
            printf "Folder name not provided. Using default, '${DEFAULT}'.\n"
            INSTALLFOLDER="${DEFAULT}"
        fi
    else
        printf "Folder type could not be determined, exiting\n"
        exit 1
    fi
}

checkdeckip() {
    ### check that ip is provided
    if [[ "$1" == "" ]]; then
        printf "An ip address must be provided, exiting.\n"
        exit 1
    fi

    ### check to make sure it's a potentially valid ipv4 address
    if ! [[ $1 =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        printf "A valid ip address must be provided, exiting.\n"
        exit 1
    fi
}

checksshport() {
    ### check to make sure a port was specified
    if [[ "$1" == "" ]]; then
        printf "ssh port not provided. Using default, '22'.\n"
        SSHPORT="22"
    fi

    ### check for valid ssh port
    if [[ $1 -le 0 ]]; then
        printf "A valid ssh port must be provided, exiting.\n"
        exit 1
    fi
}

checkpassword() {
    ### check to make sure a password was specified
    if [[ "$1" == "" ]] || ! [[ "$1" =~ ^[[:alnum:]]+$ ]]; then
        printf "Password was not provided, exiting.\n"
        exit 1
    fi
}

checksshkey() {
    ### check if ssh key is present at location provided
    if [[ "$1" == "" ]]; then
        SSHKEYLOC="$HOME/.ssh/id_rsa"
        printf "ssh key was not provided. Defaulting to $SSHKEYLOC if it exists.\n"
    fi

    ### check if sshkey is present at location
    if ! [[ -e "$1" ]]; then
        SSHKEYLOC=""
        printf "ssh key does not exist. This script will use password authentication.\n"
    fi
}

clonefromto() {
    # printf "repo=$1\n"
    # printf "outdir=$2\n"
    # printf "branch=$3\n"
    if [[ -z $3 ]]; then
        BRANCH=""
    else
        BRANCH="-b $3"
    fi
    git clone $1 $2 $BRANCH &> '/dev/null'
    CODE=$?
    if [[ $CODE -eq 128 ]]; then
        cd $2
        git fetch &> '/dev/null'
    fi
}

npmtransbundle() {
    cd $1
    if [[ "$2" == "library" ]]; then
        npm install --quiet &> '/dev/null'
        npm run build --quiet &> '/dev/null'
        sudo npm link --quiet &> '/dev/null'
    elif [[ "$2" == "frontend" ]] || [[ "$2" == "template" ]]; then
        npm install --quiet &> '/dev/null'
        npm link decky-frontend-lib --quiet &> '/dev/null'
        npm run build --quiet &> '/dev/null'
    fi
}

printf "Installing Steam Deck Plugin Loader contributor (for Steam Deck)...\n"

printf "THIS SCRIPT ASSUMES YOU ARE RUNNING IT ON A PC, NOT THE DECK!
Not planning to contribute to PluginLoader?
If so, you should not be using this script.\n
If you have a release/nightly installed this script will disable it.\n"

printf "This script requires you to have nodejs installed. (If nodejs doesn't bundle npm on your OS/distro, then npm is required as well).\n"

# [[ $count -gt 0 ]] || read -p "Press any key to continue"

if ! [[ $count -gt 0 ]] ; then
    read -p "Press any key to continue"
fi

## User chooses preffered clone & install directories

if [[ "$CLONEFOLDER" == "" ]]; then
    setfolder "$CLONEFOLDER" "clone"
fi

if [[ "$INSTALLFOLDER" == "" ]]; then
    setfolder "$INSTALLFOLDER" "install"
fi

CLONEDIR="$HOME/$CLONEFOLDER"
INSTALLDIR="/home/deck/$INSTALLFOLDER"

## Input ip address, port, password and sshkey

### DECKIP already been parsed?
if [[ "$DECKIP" == "" ]]; then
    ### get ip address of deck from user
    read -p "Enter the ip address of your Steam Deck: " DECKIP
fi

### validate DECKIP
checkdeckip "$DECKIP"

### SSHPORT already been parsed?
if [[ "$SSHPORT" == "" ]]; then
    ### get ssh port from user
    read -p "Enter the ssh port of your Steam Deck: " SSHPORT
fi

### validate SSHPORT
checksshport "$SSHPORT"

### PASSWORD already been parsed?
if [[ "$PASSWORD" == "" ]]; then
    ### prompt the user for their deck's password
    printf "Enter the password for the Steam Deck user 'deck' : "
    read -s PASSWORD
    printf "\n"
fi

### validate PASSWORD
checkpassword "$PASSWORD"

### SSHKEYLOC already been parsed?
if [[ "$SSHKEYLOC" == "" ]]; then
    ### prompt the user for their ssh key
    read -p "Enter the directory for your ssh key, for ease of connection : " SSHKEYLOC
fi

### validate SSHKEYLOC
checksshkey "$SSHKEYLOC"

if [[ "$SSHKEYLOC" == "" ]]; then
    IDENINVOC=""
else
    IDENINVOC="-i ${SSHKEYLOC}"
fi

## Create folder structure

printf "\nCloning git repositories.\n"

mkdir -p ${CLONEDIR} &> '/dev/null'

### remove folders just in case
# rm -r ${CLONEDIR}/pluginloader
# rm -r ${CLONEDIR}/pluginlibrary
# rm -r ${CLONEDIR}/plugintemplate

clonefromto "https://github.com/SteamDeckHomebrew/PluginLoader" ${CLONEDIR}/pluginloader react-frontend-plugins

clonefromto "https://github.com/SteamDeckHomebrew/decky-frontend-lib" ${CLONEDIR}/pluginlibrary

clonefromto "https://github.com/SteamDeckHomebrew/decky-plugin-template" ${CLONEDIR}/plugintemplate

## Transpile and bundle typescript

type npm &> '/dev/null'

NPMLIVES=$?

if ! [[ "$NPMLIVES" -eq 0 ]]; then
    printf "npm does not to be installed, exiting.\n"
    exit 1
fi

[ "$UID" -eq 0 ] || printf "Input password to install typscript compilier.\n"

## TODO: add a way of verifying if tsc is installed and to skip this step if it is
sudo npm install --quiet -g tsc &> '/dev/null'

printf "Transpiling and bundling typescript.\n"

npmtransbundle ${CLONEDIR}/pluginlibrary/ "library"

npmtransbundle ${CLONEDIR}/pluginloader/frontend "frontend"

npmtransbundle ${CLONEDIR}/plugintemplate "template"

## Transfer relevant files to deck

printf "Copying relevant files to install directory\n\n"

### copy files for PluginLoader
rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} ${IDENINVOC}" --exclude='.git/' --exclude='node_modules' --exclude="package-lock.json" --exclude=='frontend' --exclude="*dist*" --exclude="*contrib*" --delete ${CLONEDIR}/pluginloader/* deck@${DECKIP}:${INSTALLDIR}/pluginloader/ &> '/dev/null'
if ! [[ $? -eq 0 ]]; then
    printf "Error occurred when copying ${CLONEDIR}/pluginloader/ to ${INSTALLDIR}/pluginloader/\n"
    exit 1
fi

### copy files for PluginLoader template
rsync -avzp --mkpath --rsh="ssh -p ${SSHPORT} ${IDENINVOC}" --exclude='.git/' --exclude='node_modules' --exclude="package-lock.json" --delete ${CLONEDIR}/plugintemplate deck@${DECKIP}:${INSTALLDIR}/plugins &> '/dev/null'
if ! [[ $? -eq 0 ]]; then
    printf "Error occurred when copying ${CLONEDIR}/plugintemplate to ${INSTALLDIR}/plugins\n"
    exit 1
fi

## TODO: direct contributors to wiki for this info?

printf "Run these commands to deploy your local changes to the deck:\n"
printf "'rsync -avzp --mkpath --rsh=""\"ssh -p ${SSHPORT} ${IDENINVOC}\""" --exclude='.git/' --exclude='node_modules' --exclude="package-lock.json" --delete ${CLONEDIR}/pluginname deck@${DECKIP}:${INSTALLDIR}/plugins'\n"
printf "'rsync -avzp --mkpath --rsh=""\"ssh -p ${SSHPORT} ${IDENINVOC}\""" --exclude='.git/' --exclude='node_modules' --exclude="package-lock.json" --exclude=='frontend' --exclude='*dist*' --exclude='*contrib*' --delete ${CLONEDIR}/pluginloader/* deck@${DECKIP}:${INSTALLDIR}/pluginloader/'\n"

printf "Run in console or in a script this command to run your development version:\n'ssh deck@${DECKIP} -p 22 ${IDENINVOC} 'export PLUGIN_PATH=${INSTALLDIR}/plugins; export CHOWN_PLUGIN_PATH=0; echo 'steam' | sudo -SE python3 ${INSTALLDIR}/pluginloader/backend/main.py'\n"

## Disable Releases versions if they exist

### ssh into deck and disable PluginLoader release/nightly service
printf "Connecting via ssh to disable any PluginLoader release versions.\n"
printf "Script will exit after this. All done!\n"

ssh deck@$DECKIP -p $SSHPORT $IDENINVOC "printf ${PASSWORD} | sudo -S systemctl disable --now plugin_loader; echo $?"