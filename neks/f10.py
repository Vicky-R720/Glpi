"""
obs_hide_inject.py  — v13
=========================
- Cache la fenêtre à OBS (SetWindowDisplayAffinity via injection x64)
- Retire de la barre des tâches (WS_EX_TOOLWINDOW)
- Pavé num 0      : minimise / restaure
- Pavé num 8/2/4/6 : scroll vertical/horizontal
- Curseur OBS     : force le curseur flèche dans la fenêtre cachée

Lance en Administrateur. Aucune dépendance externe.
"""

import ctypes
import ctypes.wintypes
import argparse
import struct
import threading
import time
import platform

IS_64BIT = platform.architecture()[0] == "64bit"

# DPI-aware : GetCursorPos retourne des pixels physiques (pas logiques).
# Doit être appelé avant tout appel WinAPI lié aux coordonnées écran.
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PER_MONITOR_DPI_AWARE
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

# ── Constantes ────────────────────────────────────────────────────────────────
WDA_NONE               = 0x00000000
WDA_MONITOR            = 0x00000001
WDA_EXCLUDEFROMCAPTURE = 0x00000011

PROCESS_ALL_ACCESS     = 0x1F0FFF
MEM_COMMIT_RESERVE     = 0x3000
MEM_RELEASE            = 0x8000
PAGE_EXECUTE_READWRITE = 0x40

SW_MINIMIZE       = 6
SW_RESTORE        = 9
SW_SHOW           = 5
SW_SHOWNOACTIVATE = 4

GWL_EXSTYLE      = -20
WS_EX_TOOLWINDOW = 0x00000080
WS_EX_APPWINDOW  = 0x00040000

VK_NUMPAD0   = 0x60
VK_NUMPAD2   = 0x62
VK_NUMPAD4   = 0x64
VK_NUMPAD6   = 0x66
VK_NUMPAD8   = 0x68

# Scan codes physiques du pavé numérique (distincts des flèches étendues)
# Les flèches directionnelles ont le flag LLKHF_EXTENDED (bit 4 de flags = 1)
# Les touches du pavé num n'ont PAS ce flag
SC_F10 = 68   # touche F10 → toggle minimize/restore
SC_PAGEUP = 73
SC_PAGEDOWN = 81
SC_NUMPAD4 = 75
SC_NUMPAD6 = 77

NUMPAD_SCANCODES = {SC_PAGEUP, SC_PAGEDOWN}

WM_MOUSEWHEEL    = 0x020A
WM_MOUSEHWHEEL   = 0x020E
WHEEL_DELTA      = 120

WH_KEYBOARD_LL   = 13
WM_KEYDOWN       = 0x0100
WM_SYSKEYDOWN    = 0x0104
WM_QUIT          = 0x0012
LLKHF_EXTENDED   = 0x01   # bit 0 du champ flags dans KBDLLHOOKSTRUCT

# ── WinAPI ────────────────────────────────────────────────────────────────────
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
user32   = ctypes.WinDLL("user32",   use_last_error=True)

LPVOID = ctypes.c_void_p
SIZE_T = ctypes.c_size_t
HANDLE = ctypes.c_void_p

kernel32.GetCurrentProcessId.restype     = ctypes.wintypes.DWORD
kernel32.GetCurrentThreadId.restype      = ctypes.wintypes.DWORD
kernel32.OpenProcess.restype             = HANDLE
kernel32.OpenProcess.argtypes            = [ctypes.wintypes.DWORD, ctypes.wintypes.BOOL, ctypes.wintypes.DWORD]
kernel32.VirtualAllocEx.restype          = LPVOID
kernel32.VirtualAllocEx.argtypes         = [HANDLE, LPVOID, SIZE_T, ctypes.wintypes.DWORD, ctypes.wintypes.DWORD]
kernel32.WriteProcessMemory.restype      = ctypes.wintypes.BOOL
kernel32.WriteProcessMemory.argtypes     = [HANDLE, LPVOID, ctypes.c_char_p, SIZE_T, ctypes.POINTER(SIZE_T)]
kernel32.CreateRemoteThread.restype      = HANDLE
kernel32.CreateRemoteThread.argtypes     = [HANDLE, LPVOID, SIZE_T, LPVOID, LPVOID, ctypes.wintypes.DWORD, ctypes.wintypes.LPDWORD]
kernel32.WaitForSingleObject.restype     = ctypes.wintypes.DWORD
kernel32.WaitForSingleObject.argtypes    = [HANDLE, ctypes.wintypes.DWORD]
kernel32.VirtualFreeEx.restype           = ctypes.wintypes.BOOL
kernel32.VirtualFreeEx.argtypes          = [HANDLE, LPVOID, SIZE_T, ctypes.wintypes.DWORD]
kernel32.CloseHandle.restype             = ctypes.wintypes.BOOL
kernel32.CloseHandle.argtypes            = [HANDLE]
kernel32.GetProcAddress.restype          = LPVOID
kernel32.GetProcAddress.argtypes         = [LPVOID, ctypes.c_char_p]
kernel32.GetModuleHandleW.restype        = LPVOID
kernel32.GetModuleHandleW.argtypes       = [ctypes.c_wchar_p]

user32.EnumWindows.restype               = ctypes.wintypes.BOOL
user32.IsWindowVisible.restype           = ctypes.wintypes.BOOL
user32.GetWindowTextLengthW.restype      = ctypes.c_int
user32.GetWindowTextW.restype            = ctypes.c_int
user32.GetWindowThreadProcessId.restype  = ctypes.wintypes.DWORD
user32.SetWindowDisplayAffinity.restype  = ctypes.wintypes.BOOL
user32.SetWindowDisplayAffinity.argtypes = [ctypes.wintypes.HWND, ctypes.wintypes.DWORD]
user32.ShowWindow.restype                = ctypes.wintypes.BOOL
user32.ShowWindow.argtypes               = [ctypes.wintypes.HWND, ctypes.c_int]
user32.IsIconic.restype                  = ctypes.wintypes.BOOL
user32.IsIconic.argtypes                 = [ctypes.wintypes.HWND]
user32.GetWindowLongW.restype            = ctypes.c_long
user32.GetWindowLongW.argtypes           = [ctypes.wintypes.HWND, ctypes.c_int]
user32.SetWindowLongW.restype            = ctypes.c_long
user32.SetWindowLongW.argtypes           = [ctypes.wintypes.HWND, ctypes.c_int, ctypes.c_long]
user32.SetWindowPos.restype              = ctypes.wintypes.BOOL
user32.GetKeyState.restype               = ctypes.c_short
user32.GetKeyState.argtypes              = [ctypes.c_int]
user32.GetWindowRect.restype             = ctypes.wintypes.BOOL
user32.GetWindowRect.argtypes            = [ctypes.wintypes.HWND, ctypes.POINTER(ctypes.wintypes.RECT)]
user32.GetCursorPos.restype              = ctypes.wintypes.BOOL
user32.GetCursorPos.argtypes             = [ctypes.POINTER(ctypes.wintypes.POINT)]
user32.SetCursorPos.restype              = ctypes.wintypes.BOOL
user32.SetCursorPos.argtypes             = [ctypes.c_int, ctypes.c_int]
user32.PostMessageW.restype              = ctypes.wintypes.BOOL
user32.PostMessageW.argtypes             = [ctypes.wintypes.HWND, ctypes.wintypes.UINT,
                                            ctypes.wintypes.WPARAM, ctypes.wintypes.LPARAM]
user32.EnumChildWindows.restype          = ctypes.wintypes.BOOL
user32.SetWindowsHookExW.restype         = HANDLE
user32.SetWindowsHookExW.argtypes        = [ctypes.c_int, LPVOID, HANDLE, ctypes.wintypes.DWORD]
user32.CallNextHookEx.restype            = ctypes.c_long
user32.CallNextHookEx.argtypes           = [HANDLE, ctypes.c_int,
                                            ctypes.wintypes.WPARAM, ctypes.wintypes.LPARAM]
user32.UnhookWindowsHookEx.restype       = ctypes.wintypes.BOOL
user32.UnhookWindowsHookEx.argtypes      = [HANDLE]
user32.GetMessageW.restype               = ctypes.wintypes.BOOL
user32.TranslateMessage.restype          = ctypes.wintypes.BOOL
user32.DispatchMessageW.restype          = ctypes.c_long
user32.PostThreadMessageW.restype        = ctypes.wintypes.BOOL
user32.PostThreadMessageW.argtypes       = [ctypes.wintypes.DWORD, ctypes.wintypes.UINT,
                                            ctypes.wintypes.WPARAM, ctypes.wintypes.LPARAM]
user32.CopyIcon.restype                  = ctypes.c_void_p
user32.CopyIcon.argtypes                 = [ctypes.c_void_p]
user32.SetSystemCursor.restype           = ctypes.wintypes.BOOL
user32.SetSystemCursor.argtypes          = [ctypes.c_void_p, ctypes.wintypes.DWORD]
user32.SystemParametersInfoW.restype     = ctypes.wintypes.BOOL
user32.SystemParametersInfoW.argtypes    = [ctypes.wintypes.UINT, ctypes.wintypes.UINT,
                                             ctypes.c_void_p, ctypes.wintypes.UINT]
user32.GetForegroundWindow.restype            = ctypes.wintypes.HWND
user32.SetForegroundWindow.restype            = ctypes.wintypes.BOOL
user32.SetForegroundWindow.argtypes           = [ctypes.wintypes.HWND]
user32.IsWindow.restype                       = ctypes.wintypes.BOOL
user32.IsWindow.argtypes                      = [ctypes.wintypes.HWND]
user32.AttachThreadInput.restype              = ctypes.wintypes.BOOL
user32.AttachThreadInput.argtypes             = [ctypes.wintypes.DWORD, ctypes.wintypes.DWORD, ctypes.wintypes.BOOL]
user32.GetWindowThreadProcessId.restype       = ctypes.wintypes.DWORD
user32.SetWindowPlacement.restype             = ctypes.wintypes.BOOL
user32.SetWindowPlacement.argtypes            = [ctypes.wintypes.HWND, ctypes.c_void_p]
user32.GetWindowPlacement.restype             = ctypes.wintypes.BOOL
user32.GetWindowPlacement.argtypes            = [ctypes.wintypes.HWND, ctypes.c_void_p]


class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode",      ctypes.wintypes.DWORD),
        ("scanCode",    ctypes.wintypes.DWORD),
        ("flags",       ctypes.wintypes.DWORD),
        ("time",        ctypes.wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]


# ── Utilitaires ───────────────────────────────────────────────────────────────
def list_visible_windows():
    windows = []
    EnumProc = ctypes.WINFUNCTYPE(ctypes.wintypes.BOOL,
                                   ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    @EnumProc
    def cb(hwnd, _):
        if user32.IsWindowVisible(hwnd):
            n = user32.GetWindowTextLengthW(hwnd)
            if n > 0:
                buf = ctypes.create_unicode_buffer(n + 1)
                user32.GetWindowTextW(hwnd, buf, n + 1)
                title = buf.value.strip()
                if title:
                    pid = ctypes.wintypes.DWORD(0)
                    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                    windows.append((hwnd, title, pid.value))
        return True
    user32.EnumWindows(cb, 0)
    return windows


def find_window(partial):
    q = partial.lower()
    return [(h, t, p) for h, t, p in list_visible_windows() if q in t.lower()]


def is_admin():
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def get_window_rect(hwnd):
    r = ctypes.wintypes.RECT()
    if user32.GetWindowRect(hwnd, ctypes.byref(r)):
        return (r.left, r.top, r.right, r.bottom)
    return None


def get_window_title(hwnd):
    n = user32.GetWindowTextLengthW(hwnd)
    if not n:
        return ""
    buf = ctypes.create_unicode_buffer(n + 1)
    user32.GetWindowTextW(hwnd, buf, n + 1)
    return buf.value


def get_class_name(hwnd):
    buf = ctypes.create_unicode_buffer(256)
    ctypes.windll.user32.GetClassNameW(hwnd, buf, 256)
    return buf.value


# ── Injection shellcode x64 ───────────────────────────────────────────────────
def apply_affinity_remote(hwnd: int, pid: int, affinity: int) -> bool:
    h_user32 = kernel32.GetModuleHandleW("user32.dll")
    if not h_user32:
        return False
    fn_addr = kernel32.GetProcAddress(h_user32, b"SetWindowDisplayAffinity")
    if not fn_addr:
        return False
    sc = (
        b"\x48\xB9" + struct.pack("<Q", hwnd & 0xFFFFFFFFFFFFFFFF) +
        b"\xBA"     + struct.pack("<I", affinity) +
        b"\x48\xB8" + struct.pack("<Q", fn_addr & 0xFFFFFFFFFFFFFFFF) +
        b"\xFF\xD0" + b"\xC3"
    )
    h_proc = kernel32.OpenProcess(PROCESS_ALL_ACCESS, False, pid)
    if not h_proc:
        err = ctypes.get_last_error()
        print(f"[ERREUR] OpenProcess PID={pid} échoué. Code : {err}")
        if err == 5:
            print("         → Lance le script en tant qu'Administrateur.")
        return False
    success = False
    remote_mem = h_thread = None
    try:
        remote_mem = kernel32.VirtualAllocEx(h_proc, None, len(sc),
                                             MEM_COMMIT_RESERVE, PAGE_EXECUTE_READWRITE)
        if not remote_mem: return False
        written = SIZE_T(0)
        if not kernel32.WriteProcessMemory(h_proc, remote_mem, sc,
                                           len(sc), ctypes.byref(written)): return False
        h_thread = kernel32.CreateRemoteThread(h_proc, None, 0,
                                               remote_mem, None, 0, None)
        if not h_thread: return False
        kernel32.WaitForSingleObject(h_thread, 3000)
        success = True
    finally:
        if h_thread:   kernel32.CloseHandle(h_thread)
        if remote_mem: kernel32.VirtualFreeEx(h_proc, remote_mem, 0, MEM_RELEASE)
        kernel32.CloseHandle(h_proc)
    return success


def apply_affinity_local(hwnd: int, affinity: int) -> bool:
    return bool(user32.SetWindowDisplayAffinity(hwnd, affinity))


def set_invisible_obs(hwnd: int, pid: int) -> bool:
    my_pid = kernel32.GetCurrentProcessId()
    if pid == my_pid:
        return (apply_affinity_local(hwnd, WDA_EXCLUDEFROMCAPTURE) or
                apply_affinity_local(hwnd, WDA_MONITOR))
    ok = apply_affinity_remote(hwnd, pid, WDA_EXCLUDEFROMCAPTURE)
    if not ok:
        ok = apply_affinity_remote(hwnd, pid, WDA_MONITOR)
    return ok


# ── Barre des tâches ──────────────────────────────────────────────────────────
def remove_from_taskbar(hwnd: int):
    ex = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
    ex |=  WS_EX_TOOLWINDOW
    ex &= ~WS_EX_APPWINDOW
    user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex)
    user32.SetWindowPos(hwnd, None, 0, 0, 0, 0, ctypes.c_uint(0x0037))


def restore_taskbar(hwnd: int):
    ex = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
    ex &= ~WS_EX_TOOLWINDOW
    ex |=  WS_EX_APPWINDOW
    user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex)
    user32.SetWindowPos(hwnd, None, 0, 0, 0, 0, ctypes.c_uint(0x0037))


# ── Scroll cible (child éditeur pour VSCode/Trae) ─────────────────────────────
EDITOR_CLASSES = {"Chrome_RenderWidgetHostHWND", "Scintilla", "HwndWrapper"}


def find_scroll_target(root_hwnd):
    result = [root_hwnd]
    ChildProc = ctypes.WINFUNCTYPE(ctypes.wintypes.BOOL,
                                    ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    @ChildProc
    def cb(hwnd, _):
        if get_class_name(hwnd) in EDITOR_CLASSES:
            result[0] = hwnd
            return False
        return True
    user32.EnumChildWindows(root_hwnd, cb, 0)
    return result[0]


def do_scroll(hwnd: int, msg: int, delta: int):
    """
    Téléporte le curseur au centre de hwnd → envoie le scroll → remet le curseur.
    < 1ms → invisible visuellement.
    """
    # Sauvegarder position réelle
    real = ctypes.wintypes.POINT()
    user32.GetCursorPos(ctypes.byref(real))

    # Centre de la fenêtre cachée
    rect = get_window_rect(hwnd)
    if not rect:
        return
    cx = (rect[0] + rect[2]) // 2
    cy = (rect[1] + rect[3]) // 2

    # Téléporter → scroll → restaurer
    user32.SetCursorPos(cx, cy)
    target = find_scroll_target(hwnd)
    wparam = ctypes.c_ulong((ctypes.c_short(delta).value << 16) & 0xFFFFFFFF).value
    lparam = ctypes.c_ulong(((cy & 0xFFFF) << 16) | (cx & 0xFFFF)).value
    user32.PostMessageW(target, msg, wparam, lparam)
    user32.SetCursorPos(real.x, real.y)


# ── Hook clavier WH_KEYBOARD_LL (ctypes pur, sans dépendance) ────────────────
class NumpadScrollHook:
    """
    WH_KEYBOARD_LL dans son propre thread avec message loop dédiée.

    Règle :
      - SC_NUMPAD0 (82) + LLKHF_EXTENDED==0 → toggle minimize/restore
      - SC_NUMPAD8/2/4/6 + LLKHF_EXTENDED==0 → scroll
      - Tout le reste → laisser passer normalement
    """

    _SCAN_TO_SCROLL = {
        SC_PAGEUP: (WM_MOUSEWHEEL,  +WHEEL_DELTA),
        SC_PAGEDOWN: (WM_MOUSEWHEEL,  -WHEEL_DELTA),
    }

    def __init__(self, hwnd: int):
        self.hwnd       = hwnd
        self._active    = True
        self._hook      = None
        self._tid       = None
        self._cb_ref    = None
        self._toggle_cb = None
        self._thread    = threading.Thread(target=self._loop, daemon=True)

    def _proc(self, nCode, wParam, lParam):
        if nCode >= 0 and wParam in (WM_KEYDOWN, WM_SYSKEYDOWN):
            kb  = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
            sc  = kb.scanCode
            ext = kb.flags & LLKHF_EXTENDED  # 1=étendu(flèches), 0=pavé num

            # ── Pavé num 0 → toggle ──────────────────────────────────────────
            if sc == SC_F10:
                if self._toggle_cb:
                    threading.Thread(target=self._toggle_cb, daemon=True).start()
                return 1

            # ── Pavé num 8/2/4/6 → scroll ────────────────────────────────────
            if sc in self._SCAN_TO_SCROLL and ext == 0:
                if self._active and not user32.IsIconic(self.hwnd):
                    msg, delta = self._SCAN_TO_SCROLL[sc]
                    do_scroll(self.hwnd, msg, delta)
                return 1

        return user32.CallNextHookEx(self._hook, nCode, wParam, lParam)

    def _loop(self):
        self._tid = kernel32.GetCurrentThreadId()
        HOOKPROC  = ctypes.WINFUNCTYPE(ctypes.c_long, ctypes.c_int,
                                        ctypes.wintypes.WPARAM, ctypes.wintypes.LPARAM)
        self._cb_ref = HOOKPROC(self._proc)
        self._hook   = user32.SetWindowsHookExW(WH_KEYBOARD_LL, self._cb_ref, None, 0)
        if not self._hook:
            return
        msg = ctypes.wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))

    def start(self, toggle_cb=None):
        self._toggle_cb = toggle_cb
        self._thread.start()
        time.sleep(0.1)

    def pause(self):
        self._active = False

    def resume(self):
        self._active = True

    def stop(self):
        self._active = False
        if self._hook:
            user32.UnhookWindowsHookEx(self._hook)
            self._hook = None
        if self._tid:
            user32.PostThreadMessageW(self._tid, WM_QUIT, 0, 0)


# ── Killer OSD Num Lock ───────────────────────────────────────────────────────
# Classes connues des fenêtres OSD Num Lock selon le fabricant :
# - "NvCplNotificationIcon"     : NVIDIA
# - "MSKeyboardOSD"             : drivers Microsoft
# - "KeyboardOSD"               : drivers génériques
# - "#32770"                    : boîte de dialogue Windows générique OSD
# - "ToolTips_Class32"          : parfois utilisé pour les OSD
# - "Windows.UI.Core.CoreWindow": OSD Windows 11 moderne
# On cherche aussi par titre : "Num Lock", "NumLock", "VERR.NUM"
OSD_CLASSES = {
    "NvCplNotificationIcon", "MSKeyboardOSD", "KeyboardOSD",
    "OSDWindow", "OSD_Window", "HotkeyP", "ASUS Smart Gesture",
}
OSD_TITLES  = {"num lock", "numlock", "verr.num", "num lk", "nombre verrouillé"}

SW_HIDE = 0
WM_CLOSE = 0x0010


def kill_numlock_osd():
    """
    Cherche et cache immédiatement toute fenêtre OSD Num Lock.
    Appelé juste après le toggle → la notification n'a pas le temps de s'afficher.
    On fait plusieurs passes sur 200ms pour attraper les OSD qui apparaissent
    avec un léger délai.
    """
    def _hide_osd_windows():
        found = []
        EnumProc = ctypes.WINFUNCTYPE(ctypes.wintypes.BOOL,
                                       ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
        @EnumProc
        def cb(hwnd, _):
            cls   = get_class_name(hwnd)
            title = get_window_title(hwnd).lower()

            is_osd = (
                cls in OSD_CLASSES or
                any(t in title for t in OSD_TITLES)
            )
            if is_osd:
                user32.ShowWindow(hwnd, SW_HIDE)
                found.append(hwnd)
            return True

        user32.EnumWindows(cb, 0)
        return found

    # Passe immédiate + 3 passes à 50ms d'intervalle pour attraper les OSD tardifs
    def _run():
        for _ in range(4):
            _hide_osd_windows()
            time.sleep(0.05)

    threading.Thread(target=_run, daemon=True).start()


# ── Curseur hook souris ────────────────────────────────────────────────────────
# WH_MOUSE_LL : quand la souris est dans la fenêtre cachée, supprime
# WM_MOUSEMOVE avant qu'il atteigne l'app → pas de WM_SETCURSOR → curseur fixe.
# Les clics et la molette passent normalement.

_IDC_ARROW = ctypes.cast(ctypes.c_void_p(32512), ctypes.wintypes.LPCWSTR)
_IDC_IBEAM = ctypes.cast(ctypes.c_void_p(32513), ctypes.wintypes.LPCWSTR)

# Types de curseur disponibles pour le survol de la fenêtre cachée
CURSOR_TYPES = {"arrow": _IDC_ARROW, "ibeam": _IDC_IBEAM}

user32.LoadCursorW.restype  = ctypes.c_void_p
user32.LoadCursorW.argtypes = [ctypes.c_void_p, ctypes.wintypes.LPCWSTR]


class CursorOverrider:
    """
    Poll 30ms : quand la souris entre dans la fenêtre cachée, remplace tous les
    curseurs système par le curseur choisi (arrow ou ibeam) via SetSystemCursor.
    Restaure via SPI_SETCURSORS quand la souris ressort ou à l'arrêt.
    SetSystemCursor est la seule API cross-process fiable sans injection DLL.
    """

    # OCR_* des curseurs système à remplacer
    _OCR = [32512, 32513, 32514, 32515, 32516, 32642, 32643, 32644, 32645, 32646, 32648, 32649]
    _SPI_SETCURSORS = 0x0057

    def __init__(self, hidden_hwnd: int, cursor_type: str = "arrow"):
        self.hidden_hwnd = hidden_hwnd
        self._stop       = threading.Event()
        self._active     = True
        self._in_win     = False
        self._thread     = threading.Thread(target=self._loop, daemon=True)
        idc = CURSOR_TYPES.get(cursor_type, _IDC_ARROW)
        self._hcursor    = user32.LoadCursorW(None, idc)

    def _override(self):
        for ocr in self._OCR:
            h = user32.CopyIcon(self._hcursor)
            if h:
                user32.SetSystemCursor(h, ocr)

    def _restore(self):
        user32.SystemParametersInfoW(self._SPI_SETCURSORS, 0, None, 0)

    def _loop(self):
        while not self._stop.is_set():
            time.sleep(0.030)

            if not self._active or user32.IsIconic(self.hidden_hwnd):
                if self._in_win:
                    self._restore()
                    self._in_win = False
                continue

            pt = ctypes.wintypes.POINT()
            if not user32.GetCursorPos(ctypes.byref(pt)):
                continue
            rect = get_window_rect(self.hidden_hwnd)
            if not rect:
                continue
            l, t, r, b = rect
            inside = l <= pt.x < r and t <= pt.y < b

            if inside and not self._in_win:
                self._override()
                self._in_win = True
            elif not inside and self._in_win:
                self._restore()
                self._in_win = False

    def start(self):
        self._thread.start()

    def pause(self):
        self._active = False
        if self._in_win:
            self._restore()
            self._in_win = False

    def resume(self):
        self._active = True

    def stop(self):
        self._active = False
        self._stop.set()
        if self._in_win:
            self._restore()
            self._in_win = False


class WindowToggler:
    def __init__(self, hwnd, pid, title, hook, cursor_overrider):
        self.hwnd             = hwnd
        self.pid              = pid
        self.title            = title
        self.hook             = hook
        self.cursor_overrider = cursor_overrider
        self._last_focus      = None  # HWND de la dernière app active connue

    def _capture_focus(self):
        fg = user32.GetForegroundWindow()
        if fg and fg != self.hwnd:
            self._last_focus = fg

    def _restore_no_flash(self):
        """
        Restaure self.hwnd depuis l'état minimisé sans que la barre des tâches
        bascule son overlay gris sur (I).
        Technique : attacher notre thread input à celui de (V), puis ShowWindow —
        Windows garde (V) comme foreground car nos threads partagent la queue input.
        """
        if not (self._last_focus and user32.IsWindow(self._last_focus)):
            user32.ShowWindow(self.hwnd, SW_RESTORE)
            return

        my_tid     = kernel32.GetCurrentThreadId()
        target_tid = user32.GetWindowThreadProcessId(self._last_focus, None)

        attached = user32.AttachThreadInput(my_tid, target_tid, True)
        try:
            user32.ShowWindow(self.hwnd, SW_RESTORE)
            # Forcer (V) à rester foreground immédiatement après
            user32.SetForegroundWindow(self._last_focus)
        finally:
            if attached:
                user32.AttachThreadInput(my_tid, target_tid, False)

    def toggle(self):
        if user32.IsIconic(self.hwnd):
            self._capture_focus()
            self._restore_no_flash()
            time.sleep(0.1)
            set_invisible_obs(self.hwnd, self.pid)
            remove_from_taskbar(self.hwnd)
            self.hook.resume()
            self.cursor_overrider.resume()
        else:
            self._capture_focus()
            self.hook.pause()
            self.cursor_overrider.pause()
            user32.ShowWindow(self.hwnd, SW_MINIMIZE)
            if self._last_focus and user32.IsWindow(self._last_focus):
                user32.SetForegroundWindow(self._last_focus)


# ── Orchestration ─────────────────────────────────────────────────────────────
def apply_all(hwnd, title, pid, cursor_type: str = "arrow"):
    if not set_invisible_obs(hwnd, pid):
        print("prettier: failed to load formatting rules.")
        return

    remove_from_taskbar(hwnd)
    cursor_overrider = CursorOverrider(hwnd, cursor_type=cursor_type)
    cursor_overrider.start()

    hook    = NumpadScrollHook(hwnd)
    toggler = WindowToggler(hwnd, pid, title, hook, cursor_overrider)
    hook.start(toggle_cb=toggler.toggle)

    print("prettier extension activated" + "\n" * 20)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Arrêt] Restauration en cours...")
        hook.stop()
        cursor_overrider.stop()
        restore_taskbar(hwnd)
        my_pid = kernel32.GetCurrentProcessId()
        if pid == my_pid:
            apply_affinity_local(hwnd, WDA_NONE)
        else:
            apply_affinity_remote(hwnd, pid, WDA_NONE)
        user32.ShowWindow(hwnd, SW_SHOW)
        print("[OK] Tout restauré.")





# ── Sélection ─────────────────────────────────────────────────────────────────
def pick(matches, verb):
    if len(matches) == 1:
        return matches[0]
    print(f"\n{len(matches)} fenêtres correspondent :\n")
    for i, (h, t, p) in enumerate(matches):
        print(f"  [{i}] PID={p}  {t}")
    try:
        i = int(input(f"Numéro à {verb} : ").strip())
        if 0 <= i < len(matches):
            return matches[i]
    except ValueError:
        pass
    print("[ERREUR] Choix invalide.")
    return None


def _ask_cursor_type() -> str:
    print("\nCurseur au survol de la fenêtre cachée :")
    print("  [1] Flèche normale  (arrow)")
    print("  [2] Curseur texte   (ibeam)")
    c = input("choix [1/2, défaut=1] : ").strip()
    return "ibeam" if c == "2" else "arrow"


def interactive_mode():
    print("=" * 60)
    print("  OBS Window Hider v11")
    print("  [OBS + taskbar + Num Lock + pavé num scroll]")
    print("=" * 60)
    if not is_admin():
        print("\n[!] Pas en mode Administrateur — l'injection peut échouer.\n")

    windows = list_visible_windows()
    if not windows:
        print("[!] Aucune fenêtre visible.")
        return

    print(f"\n{len(windows)} fenêtres visibles :\n")
    for i, (hwnd, title, pid) in enumerate(windows):
        print(f"  [{i:3d}] PID={pid:<6}  {title[:65]}")

    print()
    q = input("choix : ").strip()

    if q.isdigit():
        idx = int(q)
        if 0 <= idx < len(windows):
            cursor_type = _ask_cursor_type()
            apply_all(*windows[idx], cursor_type=cursor_type)
        else:
            print("[ERREUR] Numéro invalide.")
        return

    matches = [(h, t, p) for h, t, p in windows if q.lower() in t.lower()]
    if not matches:
        print(f"[!] Rien trouvé pour '{q}'.")
        return
    r = pick(matches, "cacher")
    if r:
        cursor_type = _ask_cursor_type()
        apply_all(*r, cursor_type=cursor_type)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("window_name", nargs="?")
    ap.add_argument("--list", "-l", action="store_true")
    ap.add_argument("--cursor", choices=["arrow", "ibeam"], default=None,
                    help="curseur au survol : arrow (flèche) ou ibeam (texte)")
    args = ap.parse_args()

    if args.list:
        for hwnd, title, pid in list_visible_windows():
            print(f"  [0x{hwnd:08X}] PID={pid:<6}  {title}")
        return

    if args.window_name:
        matches = find_window(args.window_name)
        if not matches:
            print(f"[!] Rien trouvé pour '{args.window_name}'.")
        else:
            r = pick(matches, "cacher")
            if r:
                cursor_type = args.cursor if args.cursor else _ask_cursor_type()
                apply_all(*r, cursor_type=cursor_type)
        return

    interactive_mode()


if __name__ == "__main__":
    main()