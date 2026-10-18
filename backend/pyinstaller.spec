import os
from PyInstaller.building.build_main import Analysis
from PyInstaller.building.api import EXE, PYZ
from PyInstaller.utils.hooks import copy_metadata

noconsole_str = os.getenv('DECKY_NOCONSOLE', '0')
noconsole = bool(noconsole_str)
repo = os.getenv('DECKY_REPO', 'SteamDeckHomebrew/decky-loader')
branch = os.getenv('DECKY_BRANCH', 'main')
with open('build_config.py', 'w') as f:
    f.write(f"""
import os
os.environ['DECKY_PACKAGED_BUILD'] = '1'

# Build info
os.environ['DECKY_REPO'] = {repr(repo)}
os.environ['DECKY_BRANCH'] = {repr(branch)}

# Windows-specific
os.environ['DECKY_NOCONSOLE'] = {repr(noconsole_str)}
""")

name = "PluginLoader"
# if noconsole:
#    name += "_noconsole"

a = Analysis(
    ['main.py'],
    datas=[
        ('decky_loader/locales', 'decky_loader/locales'),
        ('decky_loader/static', 'decky_loader/static'),
    ] + copy_metadata('decky_loader'),
    runtime_hooks=['build_config.py'],
    hiddenimports=['logging.handlers', 'sqlite3', 'http.server', 'socketserver', 'configparser', 'decky_plugin', 'decky'],
)
pyz = PYZ(a.pure, a.zipped_data)

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
