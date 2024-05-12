"""
This module exposes various constants and helpers useful for decky plugins.

* Plugin's settings and configurations should be stored under `DECKY_PLUGIN_SETTINGS_DIR`.
* Plugin's runtime data should be stored under `DECKY_PLUGIN_RUNTIME_DIR`.
* Plugin's persistent log files should be stored under `DECKY_PLUGIN_LOG_DIR`.

Avoid writing outside of `DECKY_HOME`, storing under the suggested paths is strongly recommended.

Some basic migration helpers are available: `migrate_any`, `migrate_settings`, `migrate_runtime`, `migrate_logs`.

A logging facility `logger` is available which writes to the recommended location.
"""

__version__ = '1.0.0'

import logging

from typing import Any

"""
Constants
"""

HOME: str
"""
The home directory of the effective user running the process.
Environment variable: `HOME`.
If `root` was specified in the plugin's flags it will be `/root` otherwise the user whose home decky resides in.
e.g.: `/home/deck`
"""

USER: str
"""
The effective username running the process.
Environment variable: `USER`.
It would be `root` if `root` was specified in the plugin's flags otherwise the user whose home decky resides in.
e.g.: `deck`
"""

DECKY_VERSION: str
"""
The version of the decky loader.
Environment variable: `DECKY_VERSION`.
e.g.: `v2.5.0-pre1`
"""

DECKY_USER: str
"""
The user whose home decky resides in.
Environment variable: `DECKY_USER`.
e.g.: `deck`
"""

DECKY_USER_HOME: str
"""
The home of the user where decky resides in.
Environment variable: `DECKY_USER_HOME`.
e.g.: `/home/deck`
"""

DECKY_HOME: str
"""
The root of the decky folder.
Environment variable: `DECKY_HOME`.
e.g.: `/home/deck/homebrew`
"""

DECKY_PLUGIN_SETTINGS_DIR: str
"""
The recommended path in which to store configuration files (created automatically).
Environment variable: `DECKY_PLUGIN_SETTINGS_DIR`.
e.g.: `/home/deck/homebrew/settings/decky-plugin-template`
"""

DECKY_PLUGIN_RUNTIME_DIR: str
"""
The recommended path in which to store runtime data (created automatically).
Environment variable: `DECKY_PLUGIN_RUNTIME_DIR`.
e.g.: `/home/deck/homebrew/data/decky-plugin-template`
"""

DECKY_PLUGIN_LOG_DIR: str
"""
The recommended path in which to store persistent logs (created automatically).
Environment variable: `DECKY_PLUGIN_LOG_DIR`.
e.g.: `/home/deck/homebrew/logs/decky-plugin-template`
"""

DECKY_PLUGIN_DIR: str
"""
The root of the plugin's directory.
Environment variable: `DECKY_PLUGIN_DIR`.
e.g.: `/home/deck/homebrew/plugins/decky-plugin-template`
"""

DECKY_PLUGIN_NAME: str
"""
The name of the plugin as specified in the 'plugin.json'.
Environment variable: `DECKY_PLUGIN_NAME`.
e.g.: `Example Plugin`
"""

DECKY_PLUGIN_VERSION: str
"""
The version of the plugin as specified in the 'package.json'.
Environment variable: `DECKY_PLUGIN_VERSION`.
e.g.: `0.0.1`
"""

DECKY_PLUGIN_AUTHOR: str
"""
The author of the plugin as specified in the 'plugin.json'.
Environment variable: `DECKY_PLUGIN_AUTHOR`.
e.g.: `John Doe`
"""

DECKY_PLUGIN_LOG: str
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


def migrate_settings(*files_or_directories: str) -> dict[str, str]:
    """
    Migrate files and directories relating to plugin settings to the recommended location and remove old locations.
    Specified files will be migrated to `DECKY_PLUGIN_SETTINGS_DIR`.
    Specified directories will have their contents recursively migrated to `DECKY_PLUGIN_SETTINGS_DIR`.

    Returns the mapping of old -> new location.
    """


def migrate_runtime(*files_or_directories: str) -> dict[str, str]:
    """
    Migrate files and directories relating to plugin runtime data to the recommended location and remove old locations
    Specified files will be migrated to `DECKY_PLUGIN_RUNTIME_DIR`.
    Specified directories will have their contents recursively migrated to `DECKY_PLUGIN_RUNTIME_DIR`.

    Returns the mapping of old -> new location.
    """


def migrate_logs(*files_or_directories: str) -> dict[str, str]:
    """
    Migrate files and directories relating to plugin logs to the recommended location and remove old locations.
    Specified files will be migrated to `DECKY_PLUGIN_LOG_DIR`.
    Specified directories will have their contents recursively migrated to `DECKY_PLUGIN_LOG_DIR`.

    Returns the mapping of old -> new location.
    """


"""
Logging
"""

logger: logging.Logger
"""The main plugin logger writing to `DECKY_PLUGIN_LOG`."""

"""
Event handling
"""
# TODO better docstring im lazy
async def emit(event: str, *args: Any) -> None:
    """
    Send an event to the frontend.
    """