#!/bin/bash
# Adapted from a script provided by Jaynator495.
# Make sure to place in home directory, chmod +x plugin-info.sh and then run with ./plugin-info.sh
# Define the directory to scan
directory_to_scan="~/homebrew/plugins"

# Loop through each subdirectory (one level deep)
for dir in "$directory_to_scan"/*/; do
    # Check if package.json exists in the subdirectory
    if [ -f "${dir}package.json" ]; then
        # Extract name and version from the package.json file using jq
        name=$(jq -r '.name' "${dir}package.json")
        version=$(jq -r '.version' "${dir}package.json")

        # Output the name and version
        echo "Directory: ${dir}"
        echo "Package Name: $name"
        echo "Version: $version"
        echo "-----------------------------"
    fi
done
