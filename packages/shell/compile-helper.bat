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
::
:: The flags below make the helper run on any Windows 7 SP1 or newer machine with
:: NO Visual C++ redistributable installed, whatever build tools produced it:
::
::   /MT                  Static-link the C runtime (UCRT + vcruntime) into the
::                        exe. Without it MSVC defaults to /MD, which imports
::                        vcruntime140.dll / ucrtbase.dll and refuses to start on
::                        a machine that lacks the matching redist. On some newer
::                        toolsets /MD happens to link statically anyway, but that
::                        is not guaranteed - /MT makes it certain everywhere.
::   /D_WIN32_WINNT=0x0601  Target Windows 7: headers do not expose newer-only
::   /DWINVER=0x0601        API declarations, so nothing Win8+ sneaks in.
::   /SUBSYSTEM:CONSOLE,6.00  Pin the PE version fields to 6.00 (Vista) so the
::                        Windows 7 loader accepts the image even if a future
::                        toolset would otherwise stamp 10.0 and break Win7 load.
::
:: Verify a build with:  dumpbin /dependents native\keyhook-helper.exe
:: It must list only USER32.dll and KERNEL32.dll.
cl.exe /EHsc /O2 /MT /DWINVER=0x0601 /D_WIN32_WINNT=0x0601 native\keyhook-helper.cpp /Fe:native\keyhook-helper.exe user32.lib /link /SUBSYSTEM:CONSOLE,6.00

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
