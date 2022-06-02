#!/bin/sh

## Pre-parse arugments for ease of use
CLONEFOLDER=${1:-""}

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

clonefromto() {
    if [[ $3 -eq 0 ]]; then
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

printf "Installing Steam Deck Plugin Loader contributor (no Steam Deck)..."

printf "\nTHIS SCRIPT ASSUMES YOU ARE RUNNING IT ON A PC, NOT THE DECK!
If you are not planning to contribute to PluginLoader then you should not be using this script.\n"

printf "\nThis script requires you to have nodejs installed. (If nodejs doesn't bundle npm on your OS/distro, then npm is required as well).\n"

if [[ -z $1 ]]; then
    read -p "Press any key to continue"
fi

if [[ "$CLONEFOLDER" == "" ]]; then
    setfolder "$CLONEFOLDER" "clone"
fi

CLONEDIR="$HOME/$CLONEFOLDER"

## Create folder structure

printf "\nCloning git repositories.\n"

mkdir -p ${CLONEDIR} &> '/dev/null'

clonefromto "https://github.com/SteamDeckHomebrew/PluginLoader" ${CLONEDIR}/pluginloader react-frontend-plugins

clonefromto "https://github.com/SteamDeckHomebrew/decky-frontend-lib" ${CLONEDIR}/pluginlibrary

clonefromto "https://github.com/SteamDeckHomebrew/decky-plugin-template" ${CLONEDIR}/plugintemplate 

## Transpile and bundle typescript
type npm &> '/dev/null'

NPMLIVES=$?

if ! [[ "$NPMLIVES" -eq 0 ]]; then
    printf "npm needs to be installed, exiting.\n"
    exit 1
fi

[ "$UID" -eq 0 ] || printf "Input password to install typscript compilier.\n"

sudo npm install --quiet -g tsc &> '/dev/null'

printf "Transpiling and bundling typescript.\n"

npmtransbundle ${CLONEDIR}/pluginlibrary/ "library"

npmtransbundle ${CLONEDIR}/pluginloader/frontend "frontend"

npmtransbundle ${CLONEDIR}/plugintemplate "template"

printf "Plugin Loader is located at '${CLONEDIR}/pluginloader/'.\n"

printf "Run in console or in a script these commands to run your development version:\n'export PLUGIN_PATH=${CLONEDIR}/plugins; export CHOWN_PLUGIN_PATH=0; sudo python3 ${CLONEDIR}/pluginloader/backend/main.py'\n"

printf "All done!\n"