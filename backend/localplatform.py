import platform

if platform.system() == "Windows":
    from localplatformwin import *
    import localplatformwin as localplatform
else:
    from localplatformlinux import *
    import localplatformlinux as localplatform