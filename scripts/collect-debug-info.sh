#!/bin/bash
# chmod +x collect-debug-info.sh && collect-debug-info.sh
# Define the directory to scan
directory_to_scan="$HOME/homebrew/plugins"
system_info_file="$HOME/decky-sysinfo.txt"
backend_info_file="$HOME/decky-backend-log.txt"
frontend_info_file="$HOME/cef_log.txt"
frontend_previnfo_file="$HOME/cef_log.previous.txt"
plugin_info_file="$HOME/decky-plugin-info.txt"
archive_file="$HOME/decky-debug-info.zip"

echo "Please wait while this script collects the following debugging information:"
echo -e "\tCollecting system information..."
echo -e "\tOS Name..."
echo -e "\tRunning command: grep ^NAME= /etc/os-release > \"$system_info_file\""
grep ^NAME= /etc/os-release > "$system_info_file"
echo -e "\tOS Version (if it's SteamOS)..."
echo -e "\tRunning command: grep ^VERSION_ID= /etc/os-release >> \"$system_info_file\""
grep ^VERSION_ID= /etc/os-release >> "$system_info_file"
echo -e "\tSteam Client Version (if it's SteamOS)..."
echo -e "\tRunning command: grep \"Client version:\" \"$HOME/.steam/steam/logs/steamui_system.txt\" | tail -n 1 | sed 's/^[^:]*: //' | sed 's/^/CLIENT_VERSION=/' >> \"$system_info_file\""
grep "Client version:" "$HOME/.steam/steam/logs/steamui_system.txt" | tail -n 1 | sed 's/.*Client version: /CLIENT_VERSION=/' >> "$system_info_file"
echo ""
echo -e "\tCollecting plugin information from \"$directory_to_scan\"..."
# Loop through each subdirectory (one level deep)
for dir in "$directory_to_scan"/*/; do
    # Check if package.json exists in the subdirectory
    if [ -f "${dir}package.json" ]; then
        # Extract name and version from the package.json file using jq
        name=$(jq -r '.name' "${dir}package.json")
        version=$(jq -r '.version' "${dir}package.json")

        {
          # Output the name and version
          echo "Directory: ${dir}"
          echo "Package Name: $name"
          echo "Version: $version"
          echo "-----------------------------"
         } >> "$plugin_info_file"
    fi
done
echo -e "\tPlugin information saved to \"$plugin_info_file\""
echo ""
echo -e "\tCollecting backend logs..."
echo -e "\tRunning command: journalctl -b0  -u plugin_loader.service > \"$backend_info_file\""
journalctl -b0 -u plugin_loader.service > "$backend_info_file"
echo ""
echo -e "\tCollecting frontend logs..."
echo -e "\tRunning command: cp \"$HOME/.steam/steam/logs/cef_log.txt\" \"$frontend_info_file\""
cp "$HOME/.steam/steam/logs/cef_log.txt" "$frontend_info_file"
echo -e "\tRunning command: cp \"$HOME/.steam/steam/logs/cef_log.previous.txt\" \"$frontend_previnfo_file\""
cp "$HOME/.steam/steam/logs/cef_log.previous.txt" "$frontend_previnfo_file"
echo ""
echo "[DISCLAIMER] The frontend logs MAY contain your steam username."
echo -e "\tThe following prompt will ask for your steam username to scrub that information out of the logs"
echo -e "\tand replace it with \"anonymous\". It is IMPORTANT to ensure that you do not misspell your"
echo -e "\tusername, otherwise this scrubbing will fail to remove your username from the logs."
read -n 1 -r -s -p "Press any key to continue"
echo ""
read -p "Type your steam username and press Enter to continue: " username
echo -e "\tRunning command: sed -i \"s/$username/anonymous/Ig\" \"$frontend_info_file\""
sed -i "s/$username/anonymous/Ig" "$frontend_info_file"
echo -e "\tRunning command: sed -i \"s/$username/anonymous/Ig\" \"$frontend_previnfo_file\""
sed -i "s/$username/anonymous/Ig" "$frontend_previnfo_file"
echo ""
echo "Zipping up logs to \"$archive_file\". This may take a moment..."
echo -e "\tRunning command: zip -j \"$archive_file\" \"$system_info_file\" \"$plugin_info_file\" \"$backend_info_file\" \"$frontend_info_file\" \"$frontend_previnfo_file\"
"
zip -j "$archive_file" "$system_info_file" "$plugin_info_file" "$backend_info_file" "$frontend_info_file" "$frontend_previnfo_file"
echo "Finished zipping logs."
echo ""
echo "The following files are no longer needed and can be deleted:"
echo -e "\t$system_info_file"
echo -e "\t$plugin_info_file"
echo -e "\t$backend_info_file"
echo -e "\t$frontend_info_file"
echo -e "\t$frontend_previnfo_file"
read -p "Would you like this script to remove them (y/N)? " cleanup
case $cleanup in
  [Yy]* )
    echo -e "\tRemoving unneeded files..."
    echo -e "\tRunning command: rm \"$system_info_file\" \"$plugin_info_file\" \"$backend_info_file\" \"$frontend_info_file\" \"$frontend_previnfo_file\""
    rm "$system_info_file" "$plugin_info_file" "$backend_info_file" "$frontend_info_file" "$frontend_previnfo_file"
    ;;
  * )
    echo -e "\tSkipping cleanup"
    ;;
esac
echo "Please upload decky-debug-info.zip when reporting decky-loader issues."