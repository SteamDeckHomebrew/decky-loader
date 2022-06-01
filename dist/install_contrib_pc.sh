#!/bin/sh

printf "Installing Steam Deck Plugin Loader contributor (no Steam Deck)..."

printf "\nTHIS SCRIPT ASSUMES YOU ARE RUNNING IT ON A PC, NOT THE DECK!
If you are not planning to contribute to PluginLoader then you should not be using this script.\n"

printf "\nThis script requires you to have nodejs installed. (If nodejs doesn't bundle npm on your OS/distro, then npm is required as well).\n"

read -p "Press enter to continue"

printf "Enter the directory in /home/user to clone to.\n"
printf "Example: if your home directory is /home/user you would type: git\n"
printf "The clone directory would be: ${HOME}/git\n"
read -p "Enter your clone directory: " CLONEFOLDER

if ! [[ "$CLONEFOLDER" =~ ^[[:alnum:]]+$ ]]; then
    printf "\nFolder name not provided. Using default, 'git'.\n"
    CLONEFOLDER="git"
fi

printf "Enter the directory in /home/user to install to.\n"
printf "Example: if your home directory is ${HOME} you would type: loaderdev\n"
printf "The install directory would be: ${HOME}/loaderdev\n"
read -p "Enter your install directory: " INSTALLFOLDER

if ! [[ "$INSTALLFOLDER" =~ ^[[:alnum:]]+$ ]]; then
    printf "Folder name not provided. Using default, 'loaderdev'.\n"
    INSTALLFOLDER="loaderdev"
fi

CLONEDIR="$HOME/$CLONEFOLDER"
INSTALLDIR="$HOME/$INSTALLFOLDER"

## Create folder structure

printf "\nCloning git repositories.\n"

mkdir -p ${CLONEDIR} &> '/dev/null'

git clone https://github.com/SteamDeckHomebrew/PluginLoader ${CLONEDIR}/pluginloader -b react-frontend-plugins &> '/dev/null'
if [[ $? -eq 128 ]]; then
    cd ${CLONEDIR}/pluginloader
    git fetch  &> '/dev/null'
fi

git clone https://github.com/SteamDeckHomebrew/decky-frontend-lib ${CLONEDIR}/pluginlibrary &> '/dev/null'
if [[ $? -eq 128 ]]; then
    cd ${CLONEDIR}/pluginlibrary
    git fetch  &> '/dev/null'
fi

git clone https://github.com/SteamDeckHomebrew/decky-plugin-template ${CLONEDIR}/plugintemplate &> '/dev/null'
if [[ $? -eq 128 ]]; then
    cd ${CLONEDIR}/plugintemplate
    git fetch  &> '/dev/null'
fi

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

mkdir -p ${INSTALLDIR}/pluginloader
mkdir -p ${INSTALLDIR}/plugins/plugintemplate

rsync -avxr --exclude="*.git*" --exclude="*.vscode*"  --exclude="*dist*" --delete ${CLONEDIR}/pluginloader ${INSTALLDIR} &> '/dev/null'

rsync -avxr --exclude="*.git*" --delete ${CLONEDIR}/plugintemplate ${INSTALLDIR}/plugins &> '/dev/null'

printf "All done!\n"