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

LRESULT CALLBACK KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION) {
        KBDLLHOOKSTRUCT* pKey = (KBDLLHOOKSTRUCT*)lParam;
        DWORD vk = pKey->vkCode;
        bool isKeyDown = (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN);
        bool isKeyUp = (wParam == WM_KEYUP || wParam == WM_SYSKEYUP);
        bool isInjected = (pKey->flags & LLKHF_INJECTED) != 0;
        
        // Skip processing injected keys to prevent infinite loop
        if (isInjected) {
            return CallNextHookEx(g_keyboardHook, nCode, wParam, lParam);
        }
        
        // Track Alt key state
        if (vk == VK_MENU || vk == VK_LMENU || vk == VK_RMENU) {
            if (isKeyDown) {
                g_altPressed = true;
            } else if (isKeyUp) {
                g_altPressed = false;
            }
        }
        
        // Block Windows keys completely
        if (vk == VK_LWIN || vk == VK_RWIN) {
            LogMessage("Windows key blocked");
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
        
        // Block PrintScreen
        if (vk == VK_SNAPSHOT) {
            LogMessage("PrintScreen blocked");
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
