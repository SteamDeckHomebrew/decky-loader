#!/bin/sh

temp_pass_cleanup() {
  echo $PASS | sudo passwd -d deck
}

if (( $EUID != 0 )); then # if script is not root yet
    PASS_STATUS=$(passwd -S wumpus) ## TODO: CHANGE ME TO DECK NOT WUMPUS!!!!
    if [ "$PASS_STATUS" = "" ]; then
        echo "Deck user not found. Continuing anyway, as it probably just means user is on a non-steamos system."
    fi

    if [ "${PASS_STATUS:7:2}" = "NP" ]; then ## TODO: CHANGE ME TO ${PASS_STATUS:5:2} # if no password is set
        if [ ! zenity --question --text="You appear to have not set an admin password.\nDecky can still install by temporarily setting your password to 'Decky!' and continuing, then removing it when the installer finishes\nAre you okay with that?" ]; then
            echo "deck:Decky!" | sudo chpasswd
            trap temp_pass_cleanup EXIT # make sure password is removed when application closes
            PASS="Decky!"
        fi
    else
        # get password
        FINISHED="false"
        while [ "$FINISHED" != "true" ]; do
            PASS=$(zenity --password --text="Enter your admin password")
            if [[ $? -eq 1 ]] || [[ $? -eq 5 ]]; then
                exit 1
            fi
            if ( echo "$PASS" | sudo -S -k true ); then
                FINISHED="true"
            else
                zenity --info --text "Incorrect Password"
            fi
        done
    fi

    if ! [ $USER = "deck" ]; then
        zenity --warning --text "You appear to not be on a deck.\nDecky should still mostly work, but expect some errors."
    fi

    echo "$PASS" | sudo -S -k sh "$0" "$@"
    exit 1
fi

BRANCH=$(zenity --list --radiolist --text "Which Branch:" --hide-header --column "Buttons" --column "Choice" --column "Info" TRUE "release" "(Recommended option)" FALSE "prerelease" "(May be unstable)" )
if [[ $? -eq 1 ]] || [[ $? -eq 5 ]]; then
    exit 1
fi


USER_DIR="$(getent passwd $USER | cut -d: -f6)"
HOMEBREW_FOLDER="${USER_DIR}/homebrew"

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

echo "70" ; echo "# Kiling plugin_loader if it exists" ; # installation counts as more than 15% because it's the longest part :)
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
echo "100" ; echo "# Install finished, installer can now be closed"; sleep 1
) |
zenity --progress \
  --title="Decky Installer" \
  --text="Installing..." \
  --percentage=0 \
  --no-cancel # not actually sure how to make the cancel work properly, so it's just not there unless someone else can figure it out

if [ "$?" = -1 ] ; then
        zenity --error \
          --text="Download interrupted."
fi
