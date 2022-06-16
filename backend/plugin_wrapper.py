import multiprocessing
from json import load
from logging import getLogger
from os import path

from plugin.plugin import get_plugin_backend


class PluginWrapper:
    def __init__(self, plugin_relative_directory, plugin_path) -> None:
        self.plugin_directory = path.join(plugin_path, plugin_relative_directory)

        json = load(open(path.join(self.plugin_directory, "plugin.json"), "r"))

        self.legacy = False
        self.main_view_html = json["main_view_html"] if "main_view_html" in json else ""
        self.tile_view_html = json["tile_view_html"] if "tile_view_html" in json else ""
        self.legacy = self.main_view_html or self.tile_view_html

        self.name = json["name"]
        self.author = json["author"]
        self.flags = json["flags"]
        self.logger = getLogger(f"{self.name}")

        self.backend = get_plugin_backend(json.get("backend"), self.plugin_directory, self.flags, self.logger)

    def call_method(self, method_name, args):
        return self.backend.call_method(method_name, args)

    def start(self):
        return self.backend.start()

    def stop(self):
        return self.backend.stop()

    def __str__(self) -> str:
        return self.name
