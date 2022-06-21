#!/bin/bash

## Pre-parse arugments for ease of use
CLONEFOLDER=${1:-""}
LOADERBRANCH=${2:-""}
LIBRARYBRANCH=${3:-""}
TEMPLATEBRANCH=${4:-""}
LATEST=${5:-""}

## gather options into an array 
OPTIONSARRAY=("$CLONEFOLDER" "$LOADERBRANCH" "$LIBRARYBRANCH" "$TEMPLATEBRANCH" "$LATEST")

## iterate through options array to check their presence
count=0
for OPTION in ${OPTIONSARRAY[@]}; do
    ! [[ "$OPTION" == "" ]] && count=$(($count+1))
    # printf "OPTION=$OPTION\n"
done

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


if ! [[ $count -gt 4 ]] ; then
    printf "Installing Steam Deck Plugin Loader contributor/developer (no Steam Deck)..."

    printf "\nTHIS SCRIPT ASSUMES YOU ARE RUNNING IT ON A PC, NOT THE DECK!
    Not planning to contribute to or develop for PluginLoader?
    Then you should not be using this script.\n"

    printf "\nThis script requires you to have nodejs installed. (If nodejs doesn't bundle npm on your OS/distro, then npm is required as well).\n"
fi

if ! [[ $count -gt 0 ]] ; then
    read -p "Press any key to continue"
fi

printf "\n"

if [[ "$CLONEFOLDER" == "" ]]; then
    printf "Enter the directory in /home/user/ to clone to.\n"
    printf "The clone directory would be: ${HOME}/git \n"
    read -p "Enter your clone directory: " CLONEFOLDER
    if ! [[ "$CLONEFOLDER" =~ ^[[:alnum:]]+$ ]]; then
        printf "Folder name not provided. Using default, '${DEFAULT}'.\n"
        CLONEFOLDER="${DEFAULT}"
    fi
fi

CLONEDIR="$HOME/$CLONEFOLDER"

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

## install python dependencies (maybe use venv?)

python -m pip install -r ${CLONEDIR}/pluginloader/requirements.txt &> '/dev/null'

## Transpile and bundle typescript

[ "$UID" -eq 0 ] || printf "Input password to proceed with install.\n"

type npm &> '/dev/null'

NPMLIVES=$?

if ! [[ "$PNPMLIVES" -eq 0 ]]; then
    printf "npm does not appear to be installed, exiting.\n"
    exit 1
fi

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

printf "Plugin Loader is located at '${CLONEDIR}/pluginloader/'.\n"

printf "Run in console or in a script these commands to run your development version:\n'export PLUGIN_PATH=${CLONEDIR}/plugins; export CHOWN_PLUGIN_PATH=0; sudo -E python3 ${CLONEDIR}/pluginloader/backend/main.py'\n"

printf "All done!\n"
