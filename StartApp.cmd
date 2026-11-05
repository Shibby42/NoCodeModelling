@echo off
setlocal EnableExtensions DisableDelayedExpansion
title ISG-virtuos Signal Studio

rem Always use this file's location, including spaces and network shares.
pushd "%~dp0" >nul 2>&1
if errorlevel 1 goto folder_error
if not exist "server\launch.py" goto files_error

set "APP_PYTHON="
set "APP_PYTHON_ARG="
if defined SIGNAL_STUDIO_PYTHON goto configured_python

py -3 -c "import struct,sys; sys.exit(0 if sys.version_info >= (3,9) and struct.calcsize('P') == 8 else 1)" >nul 2>&1
if not errorlevel 1 goto python_launcher
python -c "import struct,sys; sys.exit(0 if sys.version_info >= (3,9) and struct.calcsize('P') == 8 else 1)" >nul 2>&1
if not errorlevel 1 goto python_command
python3 -c "import struct,sys; sys.exit(0 if sys.version_info >= (3,9) and struct.calcsize('P') == 8 else 1)" >nul 2>&1
if not errorlevel 1 goto python3_command
echo.
echo FEHLER: Python 3.9 oder neuer in der 64-Bit-Version wurde nicht gefunden.
echo Bitte Python installieren oder SIGNAL_STUDIO_PYTHON auf python.exe setzen.
goto error

:configured_python
"%SIGNAL_STUDIO_PYTHON%" -c "import struct,sys; sys.exit(0 if sys.version_info >= (3,9) and struct.calcsize('P') == 8 else 1)" >nul 2>&1
if errorlevel 1 goto configured_python_error
set "APP_PYTHON=%SIGNAL_STUDIO_PYTHON%"
goto run

:python_launcher
set "APP_PYTHON=py"
set "APP_PYTHON_ARG=-3"
goto run

:python_command
set "APP_PYTHON=python"
goto run

:python3_command
set "APP_PYTHON=python3"
goto run

:run
"%APP_PYTHON%" %APP_PYTHON_ARG% -u "server\launch.py" %*
set "APP_EXIT=%ERRORLEVEL%"
popd
if "%APP_EXIT%"=="0" exit /b 0
echo.
echo Die App konnte nicht korrekt gestartet werden. Details stehen oben.
pause
exit /b %APP_EXIT%

:configured_python_error
echo FEHLER: SIGNAL_STUDIO_PYTHON verweist nicht auf Python 3.9+ in 64 Bit.
echo Angegebener Pfad: "%SIGNAL_STUDIO_PYTHON%"
goto error

:files_error
echo FEHLER: server\launch.py fehlt. Bitte den vollstaendigen App-Ordner kopieren.
:error
popd
pause
exit /b 1

:folder_error
echo FEHLER: Der Ordner von StartApp.cmd kann nicht geoeffnet werden.
pause
exit /b 1
