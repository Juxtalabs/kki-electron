// Native Windows executable untuk keyboard hook
// Compile sebagai standalone .exe, dipanggil dari Electron

#include <windows.h>
#include <iostream>

HHOOK g_keyboardHook = nullptr;
bool g_running = true;

LRESULT CALLBACK KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION) {
        KBDLLHOOKSTRUCT* pKey = (KBDLLHOOKSTRUCT*)lParam;
        
        // Block Windows keys completely
        if (pKey->vkCode == VK_LWIN || pKey->vkCode == VK_RWIN) {
            std::cout << "Windows key blocked by native helper" << std::endl;
            return 1; // Block the key
        }
    }
    
    return CallNextHookEx(g_keyboardHook, nCode, wParam, lParam);
}

int main() {
    std::cout << "Starting Windows Key Blocker Helper..." << std::endl;
    
    // Install global keyboard hook
    g_keyboardHook = SetWindowsHookEx(
        WH_KEYBOARD_LL,
        KeyboardHookProc,
        GetModuleHandle(NULL),
        0
    );
    
    if (!g_keyboardHook) {
        std::cout << "Failed to install keyboard hook!" << std::endl;
        return 1;
    }
    
    std::cout << "Keyboard hook installed successfully. Press Ctrl+C to exit." << std::endl;
    
    // Message loop
    MSG msg;
    while (g_running && GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    // Cleanup
    if (g_keyboardHook) {
        UnhookWindowsHookEx(g_keyboardHook);
    }
    
    return 0;
}
