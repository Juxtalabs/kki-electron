@echo off
echo Compiling native keyboard hook helper (32-bit / x86)...

:: Setup Visual Studio 18 Build Tools environment - vcvars32 targets x86 so the
:: helper can run on a 32-bit Windows install, where the x64 copy produced by
:: compile-helper.bat will not start at all.
set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars32.bat"

:: Checked with a goto rather than an if-block: the "(x86)" in the path closes
:: a parenthesised block early once the variable is expanded.
if not exist "%VCVARS%" goto :no_buildtools

call "%VCVARS%"

:: Run from this folder so keyhook-helper.obj lands next to the copy the repo
:: already tracks. forge.config.js picks native\ia32\keyhook-helper.exe over the
:: x64 one when APP_TARGET_ARCH=ia32, so the output goes in its own folder
:: rather than under a suffixed name (extraResource copies by basename).
cd /d "%~dp0"
if not exist "native\ia32" mkdir "native\ia32"

:: Same portability flags as compile-helper.bat - see that file for the full
:: rationale. In short: /MT statically links the CRT so the exe needs NO Visual
:: C++ redistributable, the _WIN32_WINNT/WINVER defines target Windows 7, and the
:: pinned subsystem version keeps the Windows 7 loader happy. Verify a build with
:: dumpbin /dependents native\ia32\keyhook-helper.exe - only USER32.dll and
:: KERNEL32.dll should appear.
cl.exe /EHsc /O2 /MT /DWINVER=0x0601 /D_WIN32_WINNT=0x0601 native\keyhook-helper.cpp /Fo:native\ia32\ /Fe:native\ia32\keyhook-helper.exe user32.lib /link /SUBSYSTEM:CONSOLE,6.00

if %ERRORLEVEL% NEQ 0 goto :failed

echo.
echo ========================================
echo Native helper (x86) compiled successfully!
echo Output: native\ia32\keyhook-helper.exe
echo Package it with: npm run package:win32:peserta
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
