#!/bin/bash

type=$1

oldartifactsdir="old"

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd "$parent_path"

artifactfolders=$(find artifacts/ -maxdepth 1 -mindepth 1 -type d)
if [[ ${#artifactfolders[@]} > 0 ]]; then
    for i in ${artifactfolders[@]}; do
        foldername=$(dirname $i)
        subfoldername=$(basename $i)
        out=$foldername/$oldartifactsdir/$subfoldername-$(date +'%s')
        if [[ ! "$subfoldername" =~ "$oldartifactsdir" ]]; then
            mkdir -p $out
            mv $i $out
            printf "Moved "${foldername}"/"${subfoldername}" to "${out}" \n"
        fi
    done
fi

cd ..

if [[ "$type" == "release" ]]; then
    printf "release!\n"
    act workflow_dispatch -e act/release.json --artifact-server-path act/artifacts
elif [[ "$type" == "prerelease" ]]; then
    printf "prerelease!\n"
    act workflow_dispatch -e act/prerelease.json --artifact-server-path act/artifacts
else
    printf "Release type unspecified/badly specified.\n"
    printf "Options: 'release' or 'prerelease'\n"
fi

cd act/artifacts

if [[ -d "1" ]]; then
    cd "1/artifact"
    cp "PluginLoader.gz__" "PluginLoader.gz"
    gzip -d "PluginLoader.gz"
    chmod +x PluginLoader
fi
