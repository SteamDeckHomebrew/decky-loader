import os
from PyInstaller.building.build_main import Analysis
from PyInstaller.building.api import EXE, PYZ
from PyInstaller.utils.hooks import copy_metadata

a = Analysis(
    ['main.py'],
    datas=[
        ('locales', 'locales'),
        ('static', 'static'),
    ] + copy_metadata('decky_loader'),
    hiddenimports=['logging.handlers', 'sqlite3', 'decky_plugin', 'decky'],
)
pyz = PYZ(a.pure, a.zipped_data)

noconsole = bool(os.getenv('DECKY_NOCONSOLE'))
name = "PluginLoader"
if noconsole:
    name += "_noconsole"

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name=name,
    upx=True,
    console=not noconsole,
)
