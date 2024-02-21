from enum import IntEnum

class UserType(IntEnum):
    HOST_USER = 1
    EFFECTIVE_USER = 2
    ROOT = 3

class PluginLoadType(IntEnum):
    LEGACY_EVAL_IIFE = 0 # legacy, uses legacy serverAPI
    ESMODULE_V1 = 1 # esmodule loading with modern @decky/backend apis