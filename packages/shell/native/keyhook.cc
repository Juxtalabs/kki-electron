#include <napi.h>

#ifdef _WIN32
#include <windows.h>

// Global hook handle - simplified to single hook
HHOOK g_keyboardHook = nullptr;

// Simple keyboard hook for backup functionality
LRESULT CALLBACK KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION) {
    const KBDLLHOOKSTRUCT *pKey = reinterpret_cast<KBDLLHOOKSTRUCT *>(lParam);
    const DWORD vk = pKey->vkCode;

    // PrintScreen is checked outside the key-down guard on purpose: some
    // keyboards only ever report the up transition for it, and that alone is
    // enough for the shell to fire a capture. Covers bare PrtScn plus the
    // Alt / Ctrl / Win / Win+Alt variants, since none of them change the vk.
    if (vk == VK_SNAPSHOT || vk == VK_PRINT) {
      return 1;
    }

    // Block dangerous key combinations (these work in Electron)
    if (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN) {
      // Alt + Tab (Task switcher)
      if (vk == VK_TAB && (GetAsyncKeyState(VK_MENU) & 0x8000)) {
        return 1;
      }
      // Alt + F4 (Close window)
      if (vk == VK_F4 && (GetAsyncKeyState(VK_MENU) & 0x8000)) {
        return 1;
      }
      // Ctrl + Shift + Esc (Task Manager)
      if (vk == VK_ESCAPE && (GetAsyncKeyState(VK_CONTROL) & 0x8000) && (GetAsyncKeyState(VK_SHIFT) & 0x8000)) {
        return 1;
      }
      // Screen capture shortcuts hanging off the Windows key: Win+Shift+S /
      // Win+S (Snipping Tool), Win+G and Win+Alt+R / Win+Alt+G (Game Bar).
      if ((vk == 'S' || vk == 'G' || vk == 'R') &&
          ((GetAsyncKeyState(VK_LWIN) & 0x8000) || (GetAsyncKeyState(VK_RWIN) & 0x8000))) {
        return 1;
      }
      // F11 (Fullscreen)
      if (vk == VK_F11) {
        return 1;
      }
    }
  }

  return CallNextHookEx(g_keyboardHook, nCode, wParam, lParam);
}

Napi::Value Install(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (g_keyboardHook != nullptr) {
    return Napi::Boolean::New(env, true);
  }

  // Install simple keyboard hook for combinations only
  g_keyboardHook = SetWindowsHookEx(
    WH_KEYBOARD_LL,
    KeyboardHookProc,
    GetModuleHandle(NULL),
    0
  );

  return Napi::Boolean::New(env, g_keyboardHook != nullptr);
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

Napi::Value IsInstalled(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, g_keyboardHook != nullptr);
}

Napi::Value IsAvailable(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
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

Napi::Value IsInstalled(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, false);
}

Napi::Value IsAvailable(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, false);
}
#endif

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "install"), Napi::Function::New(env, Install));
  exports.Set(Napi::String::New(env, "uninstall"), Napi::Function::New(env, Uninstall));
  exports.Set(Napi::String::New(env, "isInstalled"), Napi::Function::New(env, IsInstalled));
  exports.Set(Napi::String::New(env, "isAvailable"), Napi::Function::New(env, IsAvailable));
  
  return exports;
}

NODE_API_MODULE(keyhook, Init)
