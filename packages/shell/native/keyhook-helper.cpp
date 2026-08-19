// Native Windows executable untuk keyboard hook
// Compile sebagai standalone .exe, dipanggil dari Electron

#include <windows.h>
#include <iostream>
#include <fstream>

HHOOK g_keyboardHook = nullptr;
bool g_running = true;
std::ofstream g_logFile;

void LogMessage(const char* msg) {
    if (g_logFile.is_open()) {
        g_logFile << msg << std::endl;
        g_logFile.flush();
    }
}

static bool g_altPressed = false;
static bool g_winPressed = false;

LRESULT CALLBACK KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION) {
        KBDLLHOOKSTRUCT* pKey = (KBDLLHOOKSTRUCT*)lParam;
        DWORD vk = pKey->vkCode;
        bool isKeyDown = (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN);
        bool isKeyUp = (wParam == WM_KEYUP || wParam == WM_SYSKEYUP);

        // NOTE: injected keys are deliberately NOT skipped. Precision touchpad
        // gestures (3-finger swipe = Win+Tab / Alt+Tab / Win+D, 4-finger swipe =
        // Ctrl+Win+Left/Right) reach us as injected keystrokes, so skipping them
        // would let every swipe through. We never call SendInput ourselves, so
        // there is no feedback loop to guard against.

        // Track Alt key state
        if (vk == VK_MENU || vk == VK_LMENU || vk == VK_RMENU) {
            if (isKeyDown) {
                g_altPressed = true;
            } else if (isKeyUp) {
                g_altPressed = false;
            }
        }

        // Track Windows key state ourselves - we swallow the key below, so the
        // system never records it and GetAsyncKeyState would always say "up"
        if (vk == VK_LWIN || vk == VK_RWIN) {
            if (isKeyDown) {
                g_winPressed = true;
            } else if (isKeyUp) {
                g_winPressed = false;
            }
        }

        // Block Windows keys completely (also kills Win+Tab task view)
        if (vk == VK_LWIN || vk == VK_RWIN) {
            LogMessage("Windows key blocked");
            return 1;
        }

        // Block Ctrl+Win+Left/Right (virtual desktop switch, what a 4-finger
        // swipe maps to)
        if ((vk == VK_LEFT || vk == VK_RIGHT) && g_winPressed &&
            (GetAsyncKeyState(VK_CONTROL) & 0x8000)) {
            LogMessage("Ctrl+Win+Arrow blocked");
            return 1;
        }

        // Block Ctrl+Alt+Tab (sticky app switcher)
        if (vk == VK_TAB && g_altPressed && (GetAsyncKeyState(VK_CONTROL) & 0x8000)) {
            LogMessage("Ctrl+Alt+Tab blocked");
            return 1;
        }

        // Block Tab when Alt is pressed (prevents Alt+Tab)
        if (vk == VK_TAB && g_altPressed) {
            LogMessage("Alt+Tab blocked");
            return 1;
        }
        
        // Block Escape when Alt is pressed (prevents Alt+Esc)
        if (vk == VK_ESCAPE && g_altPressed) {
            LogMessage("Alt+Esc blocked");
            return 1;
        }
        
        // Block F4 when Alt is pressed (prevents Alt+F4)
        if (vk == VK_F4 && g_altPressed) {
            LogMessage("Alt+F4 blocked");
            return 1;
        }
        
        // Block Ctrl + Shift + Esc (Task Manager)
        if (vk == VK_ESCAPE && 
            (GetAsyncKeyState(VK_CONTROL) & 0x8000) && 
            (GetAsyncKeyState(VK_SHIFT) & 0x8000)) {
            LogMessage("Ctrl+Shift+Esc blocked");
            return 1;
        }
        
        // Block PrintScreen in every form: bare, Alt+PrtScn (active window),
        // Ctrl+PrtScn, Win+PrtScn (save to file) and Win+Alt+PrtScn (Game Bar).
        // Not gated on isKeyDown: some keyboards only ever report the up
        // transition for this key, and that alone is enough to fire a capture.
        // VK_PRINT is the separate "Print" key a few layouts send instead.
        if (vk == VK_SNAPSHOT || vk == VK_PRINT) {
            LogMessage("PrintScreen blocked");
            return 1;
        }

        // Screen capture shortcuts that hang off the Windows key:
        //   Win+Shift+S / Win+S  Snipping Tool
        //   Win+G                Game Bar (has a camera button)
        //   Win+Alt+R / Win+Alt+G  Game Bar record / record last 30s
        // The Windows key itself is swallowed above, so the shell should never
        // assemble these anyway - but g_winPressed is state we track ourselves,
        // so block the second key too and a missed Win key-up can't reopen the
        // hole.
        if (g_winPressed && (vk == 'S' || vk == 'G' || vk == 'R')) {
            LogMessage("Win+S/G/R (screen capture) blocked");
            return 1;
        }
    }
    
    return CallNextHookEx(g_keyboardHook, nCode, wParam, lParam);
}

int main() {
    // Open log file in temp directory
    char tempPath[MAX_PATH];
    GetTempPathA(MAX_PATH, tempPath);
    std::string logPath = std::string(tempPath) + "keyhook-helper.log";
    g_logFile.open(logPath, std::ios::out | std::ios::app);
    
    LogMessage("=== Starting Windows Key Blocker Helper ===");
    
    // Install global keyboard hook
    g_keyboardHook = SetWindowsHookEx(
        WH_KEYBOARD_LL,
        KeyboardHookProc,
        GetModuleHandle(NULL),
        0
    );
    
    if (!g_keyboardHook) {
        LogMessage("ERROR: Failed to install keyboard hook!");
        g_logFile.close();
        return 1;
    }
    
    LogMessage("SUCCESS: Keyboard hook installed - Alt+Tab and other shortcuts will be blocked");
    
    // Message loop - required for hook to work
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    // Cleanup
    LogMessage("=== Shutting down keyboard hook ===");
    if (g_keyboardHook) {
        UnhookWindowsHookEx(g_keyboardHook);
    }
    
    g_logFile.close();
    return 0;
}
