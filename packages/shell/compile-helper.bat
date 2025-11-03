@echo off
echo Compiling native keyboard hook helper...

:: Compile dengan Visual Studio Build Tools
cl.exe /EHsc native\keyhook-helper.cpp /Fe:keyhook-helper.exe user32.lib kernel32.lib

:: Atau compile dengan MinGW jika tersedia
:: g++ -o keyhook-helper.exe native/keyhook-helper.cpp -luser32 -lkernel32

echo Native helper compiled successfully!
echo Run keyhook-helper.exe to test Windows key blocking.
pause
