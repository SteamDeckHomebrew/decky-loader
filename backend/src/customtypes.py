from enum import Enum

class UserType(Enum):
    HOST_USER = 1
    EFFECTIVE_USER = 2
    ROOT = 3