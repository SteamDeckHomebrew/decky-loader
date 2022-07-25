#!/usr/bin/env bash
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]:-$0}"; )" &> /dev/null && pwd 2> /dev/null; )";
# printf "${SCRIPT_DIR}\n"
# printf "$(dirname $0)\n"
if ! [[ -e "${SCRIPT_DIR}/settings.json" ]]; then 
     printf '.vscode/settings.json does not exist. Creating it with default settings. Exiting afterwards. Run your task again.\n\n'
     cp "${SCRIPT_DIR}/defsettings.json" "${SCRIPT_DIR}/settings.json"
     exit 1
else
    printf '.vscode/settings.json does exist. Congrats.\n'
    printf 'Make sure to change settings.json to match your deck.\n'
fi