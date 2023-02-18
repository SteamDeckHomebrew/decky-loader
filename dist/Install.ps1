If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
{
  # Relaunch as an elevated process:
  Start-Process powershell.exe "-File",('"{0}"' -f $MyInvocation.MyCommand.Path) -Verb RunAs
  exit
}

Stop-Process -Name "PluginLoader" -ErrorAction SilentlyContinue

$steam_registry = Get-ItemProperty -Path "HKLM:\SOFTWARE\Wow6432Node\Valve\Steam"
$steam_install_location = $steam_registry.InstallPath
$steam_remote_debugging_config_path = "$($steam_install_location)\.cef-enable-remote-debugging"

If (!(Test-Path $steam_remote_debugging_config_path))
{
	New-Item -Path $steam_remote_debugging_config_path
}	

$release_info = curl -UseBasicParsing https://api.github.com/repos/suchmememanyskill/decky-loader/releases/latest | ConvertFrom-Json

$service_path = "$($env:USERPROFILE)\homebrew\services"
$service_exec_path = "$($service_path)\PluginLoader.exe"
$service_ver_path = "$($service_path)\.loader.version"

If (!(Test-Path -PathType container $service_path))
{
	New-Item -ItemType Directory -Path $service_path
}	

Invoke-WebRequest -Uri $release_info.assets.browser_download_url -OutFile $service_exec_path
Out-File -NoNewline -FilePath $service_ver_path -InputObject $release_info.tag_name -Encoding ASCII

$run_script_path = "$($service_path)\run.bat"
$run_script_text = @"
@echo off

C:
cd %USERPROFILE%\homebrew\services

:loop

.\PluginLoader.exe > .\..\log.txt 2>&1

if %errorlevel% EQU 42 (
    echo Exited with exitcode 42, updating!
	del PluginLoader.exe
	move PluginLoader.exe.new PluginLoader.exe
) else (
    echo Exited with non-42 exitcode, exiting
	exit
)

goto loop
"@

Out-File -NoNewline -InputObject $run_script_text -FilePath $run_script_path -Encoding utf8

$service_name = "Decky-Runner"

if ($(Get-ScheduledTask -TaskName $service_name -ErrorAction SilentlyContinue).TaskName -eq $service_name) {
    Unregister-ScheduledTask -TaskName $service_name -Confirm:$False
}

$trigger = New-ScheduledTaskTrigger -AtLogOn
$action = New-ScheduledTaskAction -Execute "%USERPROFILE%\homebrew\services\run.bat"
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $me -LogonType S4U -RunLevel Limited
Register-ScheduledTask -Action $action -Trigger $trigger -TaskPath "Decky" -TaskName $service_name -Principal $principal

Get-ScheduledTask -TaskPath "\Decky\" | Start-ScheduledTask

echo "Done! Press any key to exit"
[Console]::ReadKey()