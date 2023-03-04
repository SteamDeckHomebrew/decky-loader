"""
This module exposes various constants and helpers useful for decky plugins.

* Plugin's settings and configurations should be stored under `DECKY_PLUGIN_SETTINGS_DIR`.
* Plugin's runtime data should be stored under `DECKY_PLUGIN_RUNTIME_DIR`.
* Plugin's persistent log files should be stored under `DECKY_PLUGIN_LOG_DIR`.

Avoid writing outside of `DECKY_HOME`, storing under the suggested paths is strongly recommended.

Some basic migration helpers are available: `migrate_any`, `migrate_settings`, `migrate_runtime`, `migrate_logs`.

A logging facility `logger` is available which writes to the recommended location.
"""

__version__ = '0.1.0'

import os
import subprocess
import logging

"""
Constants
"""

HOME: str = os.getenv("HOME", default="")
"""
The home directory of the effective user running the process.
Environment variable: `HOME`.
If `root` was specified in the plugin's flags it will be `/root` otherwise the user whose home decky resides in.
e.g.: `/home/deck`
"""

USER: str = os.getenv("USER", default="")
"""
The effective username running the process.
Environment variable: `USER`.
It would be `root` if `root` was specified in the plugin's flags otherwise the user whose home decky resides in.
e.g.: `deck`
"""

USER_ID: int = int(os.getenv("USER_ID", default="-1"))
"""
The effective UID running the process.
Environment variable: `USER_ID`.
It would be `0` if `root` was specified in the plugin's flags otherwise the id of the user whose home decky resides in.
e.g.: `1000`
"""

DECKY_VERSION: str = os.getenv("DECKY_VERSION", default="")
"""
The version of the decky loader.
Environment variable: `DECKY_VERSION`.
e.g.: `v2.5.0-pre1`
"""

DECKY_USER: str = os.getenv("DECKY_USER", default="")
"""
The user whose home decky resides in.
Environment variable: `DECKY_USER`.
e.g.: `deck`
"""

DECKY_USER_ID: int = int(os.getenv("DECKY_USER_ID", default="-1"))
"""
The UID of the user whose home decky resides in.
Environment variable: `DECKY_USER_ID`.
e.g.: `1000`
"""

DECKY_USER_HOME: str = os.getenv("DECKY_USER_HOME", default="")
"""
The home of the user where decky resides in.
Environment variable: `DECKY_USER_HOME`.
e.g.: `/home/deck`
"""

DECKY_HOME: str = os.getenv("DECKY_HOME", default="")
"""
The root of the decky folder.
Environment variable: `DECKY_HOME`.
e.g.: `/home/deck/homebrew`
"""

DECKY_PLUGIN_SETTINGS_DIR: str = os.getenv(
    "DECKY_PLUGIN_SETTINGS_DIR", default="")
"""
The recommended path in which to store configuration files (created automatically).
Environment variable: `DECKY_PLUGIN_SETTINGS_DIR`.
e.g.: `/home/deck/homebrew/settings/decky-plugin-template`
"""

DECKY_PLUGIN_RUNTIME_DIR: str = os.getenv(
    "DECKY_PLUGIN_RUNTIME_DIR", default="")
"""
The recommended path in which to store runtime data (created automatically).
Environment variable: `DECKY_PLUGIN_RUNTIME_DIR`.
e.g.: `/home/deck/homebrew/data/decky-plugin-template`
"""

DECKY_PLUGIN_LOG_DIR: str = os.getenv("DECKY_PLUGIN_LOG_DIR", default="")
"""
The recommended path in which to store persistent logs (created automatically).
Environment variable: `DECKY_PLUGIN_LOG_DIR`.
e.g.: `/home/deck/homebrew/logs/decky-plugin-template`
"""

DECKY_PLUGIN_DIR: str = os.getenv("DECKY_PLUGIN_DIR", default="")
"""
The root of the plugin's directory.
Environment variable: `DECKY_PLUGIN_DIR`.
e.g.: `/home/deck/homebrew/plugins/decky-plugin-template`
"""

DECKY_PLUGIN_NAME: str = os.getenv("DECKY_PLUGIN_NAME", default="")
"""
The name of the plugin as specified in the 'plugin.json'.
Environment variable: `DECKY_PLUGIN_NAME`.
e.g.: `Example Plugin`
"""

DECKY_PLUGIN_VERSION: str = os.getenv("DECKY_PLUGIN_VERSION", default="")
"""
The version of the plugin as specified in the 'package.json'.
Environment variable: `DECKY_PLUGIN_VERSION`.
e.g.: `0.0.1`
"""

DECKY_PLUGIN_AUTHOR: str = os.getenv("DECKY_PLUGIN_AUTHOR", default="")
"""
The author of the plugin as specified in the 'plugin.json'.
Environment variable: `DECKY_PLUGIN_AUTHOR`.
e.g.: `John Doe`
"""

DECKY_PLUGIN_LOG: str = os.path.join(DECKY_PLUGIN_LOG_DIR, "plugin.log")
"""
The path to the plugin's main logfile.
Environment variable: `DECKY_PLUGIN_LOG`.
e.g.: `/home/deck/homebrew/logs/decky-plugin-template/plugin.log`
"""

"""
Migration helpers
"""


def migrate_any(target_dir: str, *files_or_directories: str) -> dict[str, str]:
    """
    Migrate files and directories to a new location and remove old locations.
    Specified files will be migrated to `target_dir`.
    Specified directories will have their contents recursively migrated to `target_dir`.

    Returns the mapping of old -> new location.
    """
    file_map: dict[str, str] = {}
    for f in files_or_directories:
        if not os.path.exists(f):
            file_map[f] = ""
            continue
        if os.path.isdir(f):
            src_dir = f
            src_file = "."
            file_map[f] = target_dir
        else:
            src_dir = os.path.dirname(f)
            src_file = os.path.basename(f)
            file_map[f] = os.path.join(target_dir, src_file)
        subprocess.run(["sh", "-c", "mkdir -p \"$3\"; tar -cf - -C \"$1\" \"$2\" | tar -xf - -C \"$3\" && rm -rf \"$4\"",
                       "_", src_dir, src_file, target_dir, f])
    return file_map


def migrate_settings(*files_or_directories: str) -> dict[str, str]:
    """
    Migrate files and directories relating to plugin settings to the recommended location and remove old locations.
    Specified files will be migrated to `DECKY_PLUGIN_SETTINGS_DIR`.
    Specified directories will have their contents recursively migrated to `DECKY_PLUGIN_SETTINGS_DIR`.

    Returns the mapping of old -> new location.
    """
    return migrate_any(DECKY_PLUGIN_SETTINGS_DIR, *files_or_directories)


def migrate_runtime(*files_or_directories: str) -> dict[str, str]:
    """
    Migrate files and directories relating to plugin runtime data to the recommended location and remove old locations
    Specified files will be migrated to `DECKY_PLUGIN_RUNTIME_DIR`.
    Specified directories will have their contents recursively migrated to `DECKY_PLUGIN_RUNTIME_DIR`.

    Returns the mapping of old -> new location.
    """
    return migrate_any(DECKY_PLUGIN_RUNTIME_DIR, *files_or_directories)


def migrate_logs(*files_or_directories: str) -> dict[str, str]:
    """
    Migrate files and directories relating to plugin logs to the recommended location and remove old locations.
    Specified files will be migrated to `DECKY_PLUGIN_LOG_DIR`.
    Specified directories will have their contents recursively migrated to `DECKY_PLUGIN_LOG_DIR`.

    Returns the mapping of old -> new location.
    """
    return migrate_any(DECKY_PLUGIN_LOG_DIR, *files_or_directories)


"""
Logging
"""

logging.basicConfig(filename=DECKY_PLUGIN_LOG,
                    format='[%(asctime)s][%(levelname)s]: %(message)s',
                    force=True)
logger: logging.Logger = logging.getLogger()
"""The main plugin logger writing to `DECKY_PLUGIN_LOG`."""

logger.setLevel(logging.INFO)
