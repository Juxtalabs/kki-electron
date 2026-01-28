@echo off
echo Compiling native keyboard hook helper...

:: Setup Visual Studio 2022 Build Tools environment
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

:: Compile with optimizations
cl.exe /EHsc /O2 native\keyhook-helper.cpp /Fe:native\keyhook-helper.exe user32.lib

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Native helper compiled successfully!
    echo Output: native\keyhook-helper.exe
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Compilation failed!
    echo ========================================
)

pause
