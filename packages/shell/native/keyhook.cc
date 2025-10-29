#include <napi.h>

#ifdef _WIN32
#include <windows.h>

// Global hook handle
HHOOK g_keyboardHook = nullptr;

static inline bool keyDown(int vk) {
  return (GetAsyncKeyState(vk) & 0x8000) != 0;
}

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION) {
    const KBDLLHOOKSTRUCT *pKey = reinterpret_cast<KBDLLHOOKSTRUCT *>(lParam);

    if (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN) {
      const DWORD vk = pKey->vkCode;

      bool isBlockedCombo =
          // Alt + Tab
          ((vk == VK_TAB) && keyDown(VK_MENU)) ||
          // Alt + Esc
          ((vk == VK_ESCAPE) && keyDown(VK_MENU)) ||
          // Alt + F4
          ((vk == VK_F4) && keyDown(VK_MENU)) ||
          // Win + Shift + S  (Snipping Tool)
          ((vk == 'S') && keyDown(VK_LWIN) && keyDown(VK_SHIFT)) ||
          // Win + PrintScreen (fullscreen screenshot Windows)
          ((vk == VK_SNAPSHOT) && keyDown(VK_LWIN)) ||
          // Alt + PrintScreen (active window screenshot)
          ((vk == VK_SNAPSHOT) && keyDown(VK_MENU)) ||
          // PrintScreen sendiri
          (vk == VK_SNAPSHOT);

      if (isBlockedCombo) {
        return 1; // Block the key combination
      }
    }
  }

  return CallNextHookEx(nullptr, nCode, wParam, lParam);
}

Napi::Value Install(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (g_keyboardHook != nullptr) {
    // Hook already installed
    return Napi::Boolean::New(env, true);
  }

  g_keyboardHook = SetWindowsHookEx(
    WH_KEYBOARD_LL,
    LowLevelKeyboardProc,
    GetModuleHandle(NULL),
    0
  );

  if (g_keyboardHook) {
    return Napi::Boolean::New(env, true);
  } else {
    return Napi::Boolean::New(env, false);
  }
}


Napi::Value Uninstall(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (g_keyboardHook) {
    BOOL result = UnhookWindowsHookEx(g_keyboardHook);
    g_keyboardHook = nullptr;
    return Napi::Boolean::New(env, result == TRUE);
  }

  return Napi::Boolean::New(env, true);
}

#else
// Non-Windows platforms - provide stub implementations
Napi::Value Install(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, false);
}

Napi::Value Uninstall(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, true);
}
#endif

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(
    Napi::String::New(env, "install"),
    Napi::Function::New(env, Install)
  );
  exports.Set(
    Napi::String::New(env, "uninstall"),
    Napi::Function::New(env, Uninstall)
  );
  return exports;
}

NODE_API_MODULE(keyhook, Init)
