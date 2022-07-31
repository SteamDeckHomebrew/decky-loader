import certifi
import ssl

from subprocess import check_output

# global vars
ssl_ctx = ssl.create_default_context(cafile=certifi.where())
user = None
group = None

def get_ssl_context():
    return ssl_ctx

# Get the user by checking for the first logged in user. As this is run
# by systemd at startup the process is likely to start before the user
# logs in, so we will wait here until they are available. Note that
# other methods such as getenv wont work as there was no $SUDO_USER to
# start the systemd service.
def get_user() -> str:
    global user
    cmd = "who | awk '{print $1}' | sort | head -1"
    while user == None:
        name = check_output(cmd, shell=True).decode().strip()
        if name is not None:
            user = name
    return user

# Get the group of the global user. get_user must be called first.
def get_user_group() -> str:
    global group
    global user
    if user == None:
        raise ValueError("helpers.get_home_dir method called before user variable was set. Run helpers.get_user first.")
    if group == None:
        group = check_output(["id", "-g", "-n", user]).decode().strip()
    return group
