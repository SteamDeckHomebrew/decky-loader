#!/bin/sh

# if a password was set by decky, this will run when the program closes
temp_pass_cleanup() {
  echo $PASS | sudo -S -k passwd -d deck
}

# if the script is not root yet, get the password and rerun as root
if (( $EUID != 0 )); then
    PASS_STATUS=$(passwd -S deck)
    if [ "$PASS_STATUS" = "" ]; then
        echo "Deck user not found. Continuing anyway, as it probably just means user is on a non-steamos system."
    fi

    if [ "${PASS_STATUS:5:2}" = "NP" ]; then # if no password is set
        if ( zenity --title="Decky Installer" --width=300 --height=200 --question --text="You appear to have not set an admin password.\nDecky can still install by temporarily setting your password to 'Decky!' and continuing, then removing it when the installer finishes\nAre you okay with that?" ); then
            yes "Decky!" | passwd deck
            trap temp_pass_cleanup EXIT # make sure password is removed when application closes
            PASS="Decky!"
        else exit 1; fi
    else
        # get password
        FINISHED="false"
        while [ "$FINISHED" != "true" ]; do
            PASS=$(zenity --title="Decky Installer" --width=300 --height=100 --entry --hide-text --text="Enter your admin password")
            if [[ $? -eq 1 ]] || [[ $? -eq 5 ]]; then
                exit 1
            fi
            if ( echo "$PASS" | sudo -S -k true ); then
                FINISHED="true"
            else
                zenity --title="Decky Installer" --width=150 --height=40 --info --text "Incorrect Password"
            fi
        done
    fi

    if ! [ $USER = "deck" ]; then
        zenity --title="Decky Installer" --width=300 --height=100 --warning --text "You appear to not be on a deck.\nDecky should still mostly work, but you may not get full functionality."
    fi

    # get user dir before rerunning as root, otherwise it'll just be 'home/root'
    USER_DIR="$(getent passwd $USER | cut -d: -f6)"
    HOMEBREW_FOLDER="${USER_DIR}/homebrew"
    echo "$PASS" | sudo -S -k sh "$0" "$USER_DIR" "$HOMEBREW_FOLDER" # rerun script as root
    exit 1
fi

# all code below should be run as root
USER_DIR=$1
HOMEBREW_FOLDER=$2

# if decky is already installed, then also add an 'uninstall' prompt
if [[ -f "${USER_DIR}/homebrew/services/PluginLoader" ]] ; then
    BRANCH=$(zenity --title="Decky Installer" --width=360 --height=170 --list --radiolist --text "Select Option:" --hide-header --column "Buttons" --column "Choice" --column "Info" TRUE "release" "(Recommended option)" FALSE "prerelease" "(May be unstable)" FALSE "uninstall decky loader" "")
else
    BRANCH=$(zenity --title="Decky Installer" --width=300 --height=100 --list --radiolist --text "Select Branch:" --hide-header --column "Buttons" --column "Choice" --column "Info" TRUE "release" "(Recommended option)" FALSE "prerelease" "(May be unstable)" )
fi
if [[ $? -eq 1 ]] || [[ $? -eq 5 ]]; then
    exit 1
fi

# uninstall if uninstall option was selected
if [ "$BRANCH" == "uninstall decky loader" ] ; then
    (
    echo "35" ; echo "# Disabling and removing services" ;
    sudo systemctl disable --now plugin_loader.service > /dev/null
    sudo rm -f "${USER_DIR}/.config/systemd/user/plugin_loader.service"
    sudo rm -f "/etc/systemd/system/plugin_loader.service"

    echo "70" ; echo "# Removing Temporary Files" ;
    rm -rf "/tmp/plugin_loader"
    rm -rf "/tmp/user_install_script.sh"

    echo "100" ; echo "# Cleaning services folder" ;
    sudo rm "${HOMEBREW_FOLDER}/services/PluginLoader"
    ) |
    zenity --progress \
  --title="Decky Installer" \
   --width=300 --height=100 \
  --text="Installing..." \
  --percentage=0 \
  --no-cancel
  exit 1
fi

# otherwise install decky loader
(
echo "15" ; echo "# Creating file structure" ;
rm -rf "${HOMEBREW_FOLDER}/services"
sudo mkdir -p "${HOMEBREW_FOLDER}/services"
sudo mkdir -p "${HOMEBREW_FOLDER}/plugins"
touch "${USER_DIR}/.steam/steam/.cef-enable-remote-debugging"

echo "30" ; echo "# Finding latest $BRANCH";
if [ $BRANCH = 'prerelease' ] ; then
    RELEASE=$(curl -s 'https://api.github.com/repos/SteamDeckHomebrew/decky-loader/releases' | jq -r "first(.[] | select(.prerelease == "true"))")
else
    RELEASE=$(curl -s 'https://api.github.com/repos/SteamDeckHomebrew/decky-loader/releases' | jq -r "first(.[] | select(.prerelease == "false"))")
fi
read VERSION DOWNLOADURL < <(echo $(jq -r '.tag_name, .assets[].browser_download_url' <<< ${RELEASE}))

echo "45" ; echo "# Installing version $VERSION" ;
curl -L $DOWNLOADURL --output ${HOMEBREW_FOLDER}/services/PluginLoader
chmod +x ${HOMEBREW_FOLDER}/services/PluginLoader
echo $VERSION > ${HOMEBREW_FOLDER}/services/.loader.version

echo "70" ; echo "# Kiling plugin_loader if it exists" ;
systemctl --user stop plugin_loader 2> /dev/null
systemctl --user disable plugin_loader 2> /dev/null
systemctl stop plugin_loader 2> /dev/null
systemctl disable plugin_loader 2> /dev/null

echo "85" ; echo "# Setting up systemd" ;
curl -L https://raw.githubusercontent.com/SteamDeckHomebrew/decky-loader/main/dist/plugin_loader-${BRANCH}.service  --output ${HOMEBREW_FOLDER}/services/plugin_loader-${BRANCH}.service
cat > "${HOMEBREW_FOLDER}/services/plugin_loader-backup.service" <<- EOM
[Unit]
Description=SteamDeck Plugin Loader
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=root
Restart=always
ExecStart=${HOMEBREW_FOLDER}/services/PluginLoader
WorkingDirectory=${HOMEBREW_FOLDER}/services
KillSignal=SIGKILL
Environment=PLUGIN_PATH=${HOMEBREW_FOLDER}/plugins
Environment=LOG_LEVEL=INFO
[Install]
WantedBy=multi-user.target
EOM

# if .service file doesn't exist for whatever reason, use backup file instead
if [[ -f "${HOMEBREW_FOLDER}/services/plugin_loader-${BRANCH}.service" ]]; then
    printf "Grabbed latest ${BRANCH} service.\n"
    sed -i -e "s|\${HOMEBREW_FOLDER}|${HOMEBREW_FOLDER}|" "${HOMEBREW_FOLDER}/services/plugin_loader-${BRANCH}.service"
    cp -f "${HOMEBREW_FOLDER}/services/plugin_loader-${BRANCH}.service" "/etc/systemd/system/plugin_loader.service"
else
    printf "Could not curl latest ${BRANCH} systemd service, using built-in service as a backup!\n"
    rm -f "/etc/systemd/system/plugin_loader.service"
    cp "${HOMEBREW_FOLDER}/services/plugin_loader-backup.service" "/etc/systemd/system/plugin_loader.service"
fi

mkdir -p ${HOMEBREW_FOLDER}/services/.systemd
cp ${HOMEBREW_FOLDER}/services/plugin_loader-${BRANCH}.service ${HOMEBREW_FOLDER}/services/.systemd/plugin_loader-${BRANCH}.service
cp ${HOMEBREW_FOLDER}/services/plugin_loader-backup.service ${HOMEBREW_FOLDER}/services/.systemd/plugin_loader-backup.service
rm ${HOMEBREW_FOLDER}/services/plugin_loader-backup.service ${HOMEBREW_FOLDER}/services/plugin_loader-${BRANCH}.service

systemctl daemon-reload
systemctl start plugin_loader
systemctl enable plugin_loader
echo "100" ; echo "# Install finished, installer can now be closed";
) |
zenity --progress \
  --title="Decky Installer" \
  --width=300 --height=100 \
  --text="Installing..." \
  --percentage=0 \
  --no-cancel # not actually sure how to make the cancel work properly, so it's just not there unless someone else can figure it out

if [ "$?" = -1 ] ; then
        zenity --title="Decky Installer" --width=150 --height=70 --error --text="Download interrupted."
fi
