#!/usr/bin/env bash
set -eo pipefail

type=$1
# bump=$2

oldartifactsdir="old"

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" || exit ; pwd -P )
cd "$parent_path" || exit

for i in artifacts/*; do
    if [[ ! -d "$i" ]]; then
        continue;
    fi
    subfoldername=$(basename "$i")

    if [[ "$subfoldername" == "$oldartifactsdir" ]]; then
        continue;
    fi

    out=artifacts/$oldartifactsdir/$subfoldername-$(date +'%s')
    mkdir -p "$out"
    mv "$i" "$out"
    echo "Moved artifacts/${subfoldername} to ${out}"
done

cd ..

if [[ "$type" == "release" ]]; then
    printf "release!\n"
    act workflow_dispatch -e act/release.json --artifact-server-path act/artifacts --container-architecture linux/amd64 --platform ubuntu-22.04=catthehacker/ubuntu:act-22.04
elif [[ "$type" == "prerelease" ]]; then
    printf "prerelease!\n"
    act workflow_dispatch -e act/prerelease.json --artifact-server-path act/artifacts --container-architecture linux/amd64 --platform ubuntu-22.04=catthehacker/ubuntu:act-22.04
else
    printf "Release type unspecified/badly specified.\n"
    printf "Options: 'release' or 'prerelease'\n"
fi

cd act/artifacts || exit

if [[ -d "1" ]]; then
    cd "1/artifact" || exit
    cp "PluginLoader.gz__" "PluginLoader.gz"
    gzip -d "PluginLoader.gz"
    chmod +x PluginLoader
fi
