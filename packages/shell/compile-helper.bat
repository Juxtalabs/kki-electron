@echo off
echo Compiling native keyboard hook helper...

:: Setup Visual Studio 18 Build Tools environment
set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

:: Checked with a goto rather than an if-block: the "(x86)" in the path closes
:: a parenthesised block early once the variable is expanded.
if not exist "%VCVARS%" goto :no_buildtools

call "%VCVARS%"

:: Compile with optimizations. Run from this folder so keyhook-helper.obj lands
:: next to the copy the repo already tracks.
cd /d "%~dp0"
cl.exe /EHsc /O2 native\keyhook-helper.cpp /Fe:native\keyhook-helper.exe user32.lib

if %ERRORLEVEL% NEQ 0 goto :failed

:: Browser.js falls back to this copy when native\ is missing, so keep the two
:: in step - a stale fallback silently runs an older set of key blocks.
copy /y native\keyhook-helper.exe keyhook-helper.exe >nul

echo.
echo ========================================
echo Native helper compiled successfully!
echo Output: native\keyhook-helper.exe
echo Fallback copy updated: keyhook-helper.exe
echo ========================================
pause
exit /b 0

:no_buildtools
echo.
echo ========================================
echo Visual Studio 18 Build Tools not found at:
echo %VCVARS%
echo Install the "Desktop development with C++" workload, or edit VCVARS
echo at the top of this script to point at the Build Tools you have.
echo ========================================
pause
exit /b 1

:failed
echo.
echo ========================================
echo Compilation failed!
echo ========================================
pause
exit /b 1
