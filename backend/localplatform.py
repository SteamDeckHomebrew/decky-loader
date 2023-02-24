import platform

ON_WINDOWS = platform.system() == "Windows"
ON_LINUX = not ON_WINDOWS

if ON_WINDOWS:
    from localplatformwin import *
    import localplatformwin as localplatform
else:
    from localplatformlinux import *
    import localplatformlinux as localplatform