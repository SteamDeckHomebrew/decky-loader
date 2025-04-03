#!/usr/bin/env bash
# Usage: deckdebug.sh DECKIP:8081
# Dependencies: websocat jq curl chromium

required_dependencies=(lalala websocat jq curl chromium)

# Check if the dependencies are installed
for cmd in "${required_dependencies[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: '$cmd' is not installed. Please install it and try again." >&2
        exit 1
    fi
done

# https://jackson.dev/post/a-portable-nix-shell-shebang/
if [ -z "$INSIDE_NIX_RANDOMSTRING" ] && command -v nix &> /dev/null; then
  # If the user has nix, relaunch in nix shell with dependencies added
  INSIDE_NIX_RANDOMSTRING=1 nix shell \
      nixpkgs#websocat \
      nixpkgs#jq \
      nixpkgs#curl \
      --command "$0" "$@"
  exit $?
fi

chromium --remote-debugging-port=9222 &
sleep 2

ADDR=$1

LOCAL=localhost:9222
LOCALTARGETS=$(curl -s http://$LOCAL/json/list)
LOCALTARGET=$(jq -r '.[] | select(.title=="New Tab") | .id' <<< "$LOCALTARGETS")
echo startup tab $LOCALTARGET

TARGET=0
while :; do
    NEWTARGET=$(curl -s http://$ADDR/json/list | jq -r '.[] | select(.title=="SharedJSContext") | .id')

    if [[ $NEWTARGET != "" ]] && [[ $NEWTARGET != $TARGET ]]; then
        echo found new tab at $NEWTARGET
        TARGET=$NEWTARGET
        TARGETURL="http://$ADDR/devtools/inspector.html?ws=$ADDR/devtools/page/$TARGET"

        LOCALTARGET=$(echo '{"id": 1, "method": "Target.createTarget", "params": {"background": true, "url": "'$TARGETURL'"}}
{"id": 2, "method": "Target.closeTarget", "params": {"targetId": "'$LOCALTARGET'"}}' \
            | websocat ws://$LOCAL/devtools/page/$LOCALTARGET \
            | jq -r '.result.targetId')

        echo started devtools at $LOCALTARGET
    fi

    sleep 5
done
