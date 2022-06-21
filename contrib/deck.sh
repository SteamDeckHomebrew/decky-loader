#!/bin/bash

## Before using this script, enable sshd on the deck and setup an sshd key between the deck and your dev in sshd_config.
## This script defaults to port 22 unless otherwise specified, and cannot run without a sudo password or LAN IP.
## You will need to specify the path to the ssh key if using key connection exclusively.

## TODO: document latest changes to wiki

## Pre-parse arugments for ease of use
CLONEFOLDER=${1:-""}
INSTALLFOLDER=${2:-""}
DECKIP=${3:-""}
SSHPORT=${4:-""}
PASSWORD=${5:-""}
SSHKEYLOC=${6:-""}
LOADERBRANCH=${7:-""}
LIBRARYBRANCH=${8:-""}
TEMPLATEBRANCH=${9:-""}
LATEST=${10:-""}

## gather options into an array 
OPTIONSARRAY=("$CLONEFOLDER" "$INSTALLFOLDER" "$DECKIP" "$SSHPORT" "$PASSWORD" "$SSHKEYLOC" "$LOADERBRANCH" "$LIBRARYBRANCH" "$TEMPLATEBRANCH" "$LATEST")

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
        local DEFAULT="dev"
    fi
    
    if [[ "$ACTION" == "clone" ]]; then
        printf "Enter the directory in /home/user/ to ${ACTION} to.\n"
        printf "The ${ACTION} directory would be: ${HOME}/${DEFAULT}\n"
        read -p "Enter your ${ACTION} directory: " CLONEFOLDER
        if ! [[ "$CLONEFOLDER" =~ ^[[:alnum:]]+$ ]]; then
            printf "Folder name not provided. Using default, '${DEFAULT}'.\n"
            CLONEFOLDER="${DEFAULT}"
        fi
    elif [[ "$ACTION" == "install" ]]; then
        printf "Enter the directory in /home/deck/homebrew to ${ACTION} pluginloader to.\n"
        printf "The ${ACTION} directory would be: /home/deck/homebrew/${DEFAULT}/pluginloader\n"
        printf "It is highly recommended that you use the default folder path seen above, just press enter at the next prompt.\n"
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

checkpassword() {
    ### check to make sure a password for 'deck' was specified
    if [[ "$1" == "" ]]; then
        printf "Remote deck user password was not provided, exiting.\n"
        exit 1
    fi
}

clonefromto() {
    # printf "repo=$1\n"
    # printf "outdir=$2\n"
    # printf "branch=$3\n"
    printf "Repository: $1\n"
    git clone $1 $2 &> '/dev/null'
    CODE=$?
    # printf "CODE=${CODE}"
    if [[ $CODE -eq 128 ]]; then
        cd $2
        git fetch --all &> '/dev/null'
    fi
    if [[ -z $3 ]]; then
        printf "Enter the desired branch for repository "$1" :\n"
        local OUT="$(git branch -r | sed '/\/HEAD/d')"
        # $OUT="$($OUT > )"
        printf "$OUT\nbranch: "
        read BRANCH
    else
        printf "on branch: $3\n"
        BRANCH="$3"
    fi
    if ! [[ -z ${BRANCH} ]]; then
        git checkout $BRANCH &> '/dev/null'
    fi
    if [[ ${LATEST} == "true" ]]; then
        git pull --all
    elif [[ ${LATEST} == "true" ]]; then
        printf "Assuming user not pulling latest commits.\n"
    else
        printf "Pull latest commits? (y/N): "
        read PULL
        case ${PULL:0:1} in
            y|Y )
                printf "Pulling latest commits.\n"
                git pull --all
            ;;
            * )
                printf "Not pulling latest commits.\n"
            ;;
        esac
        if ! [[ "$PULL" =~ ^[[:alnum:]]+$ ]]; then
            printf "Assuming user not pulling latest commits.\n"
        fi
    fi
}

pnpmtransbundle() {
    cd $1
    if [[ "$2" == "library" ]]; then
        npm install --quiet &> '/dev/null'
        npm run build --quiet &> '/dev/null'
        sudo npm link --quiet &> '/dev/null'
    elif [[ "$2" == "frontend" ]]; then
        pnpm i &> '/dev/null'
        pnpm run build &> '/dev/null'
    elif [[ "$2" == "template" ]]; then
        pnpm i &> '/dev/null'
        pnpm run build &> '/dev/null'
    fi
}

if ! [[ $count -gt 9 ]] ; then
    printf "Installing Steam Deck Plugin Loader contributor/developer (for Steam Deck)...\n"

    printf "THIS SCRIPT ASSUMES YOU ARE RUNNING IT ON A PC, NOT THE DECK!
    Not planning to contribute to or develop for PluginLoader?
    If so, you should not be using this script.\n
    If you have a release/nightly installed this script will disable it.\n"

    printf "This script requires you to have nodejs installed. (If nodejs doesn't bundle npm on your OS/distro, then npm is required as well).\n"
fi

if ! [[ $count -gt 0 ]] ; then
    read -p "Press any key to continue"
fi

printf "\n"

## User chooses preffered clone & install directories

if [[ "$CLONEFOLDER" == "" ]]; then
    setfolder "$CLONEFOLDER" "clone"
fi

if [[ "$INSTALLFOLDER" == "" ]]; then
    setfolder "$INSTALLFOLDER" "install"
fi

CLONEDIR="$HOME/$CLONEFOLDER"
INSTALLDIR="/home/deck/homebrew/$INSTALLFOLDER"

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

printf "Cloning git repositories.\n"

mkdir -p ${CLONEDIR} &> '/dev/null'

### remove folders just in case
# rm -r ${CLONEDIR}/pluginloader
# rm -r ${CLONEDIR}/pluginlibrary
# rm -r ${CLONEDIR}/plugintemplate

clonefromto "https://github.com/SteamDeckHomebrew/PluginLoader" ${CLONEDIR}/pluginloader "$LOADERBRANCH"

clonefromto "https://github.com/SteamDeckHomebrew/decky-frontend-lib" ${CLONEDIR}/pluginlibrary "$LIBRARYBRANCH"

clonefromto "https://github.com/SteamDeckHomebrew/decky-plugin-template" ${CLONEDIR}/plugintemplate "$TEMPLATEBRANCH"

## install python dependencies to deck

printf "\nInstalling python dependencies.\n"

rsync -azp --rsh="ssh -p $SSHPORT $IDENINVOC" ${CLONEDIR}/pluginloader/requirements.txt deck@${DECKIP}:${INSTALLDIR}/pluginloader/requirements.txt &> '/dev/null'

ssh deck@${DECKIP} -p ${SSHPORT} ${IDENINVOC} "python -m ensurepip && python -m pip install --upgrade pip && python -m pip install --upgrade setuptools && python -m pip install -r $INSTALLDIR/pluginloader/requirements.txt" &> '/dev/null'

## Transpile and bundle typescript

[ "$UID" -eq 0 ] || printf "Input password to proceed with install.\n"

sudo npm install -g pnpm &> '/dev/null'

type pnpm &> '/dev/null'

PNPMLIVES=$?

if ! [[ "$PNPMLIVES" -eq 0 ]]; then
    printf "pnpm does not appear to be installed, exiting.\n"
    exit 1
fi

printf "Transpiling and bundling typescript.\n"

pnpmtransbundle ${CLONEDIR}/pluginlibrary/ "library"

pnpmtransbundle ${CLONEDIR}/pluginloader/frontend "frontend"

pnpmtransbundle ${CLONEDIR}/plugintemplate "template"

## Transfer relevant files to deck

printf "Copying relevant files to install directory\n\n"

ssh deck@${DECKIP} -p ${SSHPORT} ${IDENINVOC} "mkdir -p $INSTALLDIR/pluginloader && mkdir -p $INSTALLDIR/plugins" &> '/dev/null'

### copy files for PluginLoader
rsync -avzp --rsh="ssh -p $SSHPORT $IDENINVOC" --exclude='.git/' --exclude='.github/' --exclude='.vscode/' --exclude='frontend/' --exclude='dist/' --exclude='contrib/' --exclude='*.log' --exclude='requirements.txt' --exclude='backend/__pycache__/' --exclude='.gitignore' --delete ${CLONEDIR}/pluginloader/* deck@${DECKIP}:${INSTALLDIR}/pluginloader &> '/dev/null'

if ! [[ $? -eq 0 ]]; then
    printf "Error occurred when copying $CLONEDIR/pluginloader/ to $INSTALLDIR/pluginloader/\n"
    printf "Check that your Steam Deck is active, ssh is enabled and running and is accepting connections.\n"
    exit 1
fi

### copy files for plugin template
rsync -avzp --rsh="ssh -p $SSHPORT $IDENINVOC" --exclude='.git/' --exclude='.github/' --exclude='.vscode/' --exclude='node_modules/' --exclude='src/' --exclude='*.log' --exclude='.gitignore' --exclude='pnpm-lock.yaml' --exclude='package.json' --exclude='rollup.config.js' --exclude='tsconfig.json' --delete ${CLONEDIR}/plugintemplate deck@${DECKIP}:${INSTALLDIR}/plugins &> '/dev/null'
if ! [[ $? -eq 0 ]]; then
    printf "Error occurred when copying $CLONEDIR/plugintemplate to $INSTALLDIR/plugins\n"
    exit 1
fi

## TODO: direct contributors to wiki for this info?

printf "Run these commands to deploy your local changes to the deck:\n"
printf "'rsync -avzp --mkpath --rsh=""\"ssh -p $SSHPORT $IDENINVOC\""" --exclude='.git/' --exclude='.github/' --exclude='.vscode/' --exclude='frontend/' --exclude='dist/' --exclude='contrib/' --exclude='*.log' --exclude='requirements.txt' --exclude='backend/__pycache__/' --exclude='.gitignore' --delete $CLONEDIR/pluginloader/* deck@$DECKIP:$INSTALLDIR/pluginloader/'\n"
printf "'rsync -avzp --mkpath --rsh=""\"ssh -p $SSHPORT $IDENINVOC\""" --exclude='.git/' --exclude='.github/' --exclude='.vscode/' --exclude='node_modules/' --exclude='src/' --exclude='*.log' --exclude='.gitignore' --exclude='package-lock.json' --delete $CLONEDIR/pluginname deck@$DECKIP:$INSTALLDIR/plugins'\n\n"

printf "Run in console or in a script this command to run your development version:\n'ssh deck@$DECKIP -p $SSHPORT $IDENINVOC 'export PLUGIN_PATH=$INSTALLDIR/plugins; export CHOWN_PLUGIN_PATH=0; echo 'steam' | sudo -SE python3 $INSTALLDIR/pluginloader/backend/main.py'\n"

## Disable Releases versions if they exist

### ssh into deck and disable PluginLoader release/nightly service
printf "Connecting via ssh to disable any PluginLoader release versions.\n"
printf "Script will exit after this. All done!\n"

ssh deck@${DECKIP} -p ${SSHPORT} ${IDENINVOC} "printf $PASSWORD | sudo -S systemctl disable --now plugin_loader; echo $?" &> '/dev/null'
