from posixpath import join

from genericpath import isfile

from plugin.binary_plugin import BinaryPlugin
from plugin.passive_plugin import PassivePlugin
from plugin.python_plugin import PythonPlugin


def get_plugin_backend(spec, plugin_directory, flags, logger):
    if spec == None and isfile(join(plugin_directory, "main.py")):
        return PythonPlugin(plugin_directory, "main.py", flags, logger)
    elif spec["type"] == "python":
        return PythonPlugin(plugin_directory, spec["file"], flags, logger)
    elif spec["type"] == "binary":
        return BinaryPlugin(plugin_directory, spec["file"], flags, logger)
    else:
        return PassivePlugin(logger)
