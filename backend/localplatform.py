import platform

ON_WINDOWS = platform.system() == "Windows"

if ON_WINDOWS:
    from localplatformwin import *
    import localplatformwin as localplatform
else:
    from localplatformlinux import *
    import localplatformlinux as localplatform