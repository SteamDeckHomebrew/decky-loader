import platform

if platform.system() == "Windows":
    from localplatformwin import *
else:
    from localplatformlinux import *